import { describe, expect, test } from 'vitest';
import { HttpTransport } from './http-transport';
import { AuthError, GatewayError } from '../errors/errors';
import { StaticTokenProvider, type AccessToken, type TokenProvider } from '../auth/token-provider';

// The first test to exercise the `fetchImpl` seam that has existed since
// HttpTransport was written. Structural injection only — no vi.fn in this repo.

function token(accessToken: string): AccessToken {
  return { accessToken, expiresAt: Date.now() + 60_000, scopes: ['profile:read'], tenantId: 42 };
}

interface Call {
  url: string;
  method: string;
  auth: string | null;
  contentType: string | null;
}

function recordingFetch(responses: Array<{ status?: number; body?: unknown }>) {
  const calls: Call[] = [];
  let i = 0;
  const impl = ((url: string | URL, init?: RequestInit) => {
    const h = new Headers(init?.headers);
    calls.push({
      url: String(url),
      method: init?.method ?? 'GET',
      auth: h.get('Authorization'),
      contentType: h.get('Content-Type'),
    });
    const r = responses[Math.min(i++, responses.length - 1)]!;
    return Promise.resolve(
      new Response(r.body === undefined ? null : JSON.stringify(r.body), {
        status: r.status ?? 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  }) as unknown as typeof fetch;
  return { impl, calls };
}

/** A provider whose refresh() actually yields a different token. */
function rotatingProvider(first: string, next: string): TokenProvider {
  let current = first;
  return {
    getToken: () => Promise.resolve(token(current)),
    refresh: () => {
      current = next;
      return Promise.resolve(token(current));
    },
  };
}

describe('HttpTransport auth headers', () => {
  test('attaches the bearer token and omits Content-Type when there is no body', async () => {
    const f = recordingFetch([{ body: { id: 42, name: 'Demo' } }]);
    const t = new HttpTransport({
      baseUrl: 'https://api.udp.city',
      tokens: new StaticTokenProvider(token('tok-a')),
      fetchImpl: f.impl,
    });

    await t.getElement();
    expect(f.calls[0]!.url).toBe('https://api.udp.city/v1/element');
    expect(f.calls[0]!.auth).toBe('Bearer tok-a');
    expect(f.calls[0]!.contentType).toBeNull();
  });

  test('sets Content-Type when a body is present', async () => {
    const f = recordingFetch([{ body: { key: 'prefs' } }]);
    const t = new HttpTransport({
      baseUrl: 'https://api.udp.city',
      tokens: new StaticTokenProvider(token('tok-a')),
      fetchImpl: f.impl,
    });

    await t.putStorage('prefs', { theme: 'dark' });
    expect(f.calls[0]!.contentType).toBe('application/json');
  });
});

describe('401 handling', () => {
  test('maps 401 to AuthError on a normal request', async () => {
    const f = recordingFetch([{ status: 401, body: {} }]);
    const t = new HttpTransport({
      baseUrl: 'https://api.udp.city',
      tokens: new StaticTokenProvider(token('tok-a')),
      fetchImpl: f.impl,
    });
    await expect(t.getElement()).rejects.toBeInstanceOf(AuthError);
  });

  // Regression: getStorage() used to bypass req() entirely, so a 401 there
  // surfaced as GatewayError while every other path gave AuthError.
  test('maps 401 to AuthError on getStorage too', async () => {
    const f = recordingFetch([{ status: 401, body: {} }]);
    const t = new HttpTransport({
      baseUrl: 'https://api.udp.city',
      tokens: new StaticTokenProvider(token('tok-a')),
      fetchImpl: f.impl,
    });
    await expect(t.getStorage('k')).rejects.toBeInstanceOf(AuthError);
  });

  // Regression guard for the 404-before-401 ordering in getStorage.
  test('getStorage returns undefined on 404', async () => {
    const f = recordingFetch([{ status: 404, body: {} }]);
    const t = new HttpTransport({
      baseUrl: 'https://api.udp.city',
      tokens: new StaticTokenProvider(token('tok-a')),
      fetchImpl: f.impl,
    });
    expect(await t.getStorage('missing')).toBeUndefined();
  });
});

describe('refresh-on-401', () => {
  test('retries once with a refreshed token', async () => {
    const f = recordingFetch([{ status: 401, body: {} }, { body: { id: 42, name: 'Demo' } }]);
    const t = new HttpTransport({
      baseUrl: 'https://api.udp.city',
      tokens: rotatingProvider('tok-a', 'tok-b'),
      fetchImpl: f.impl,
    });

    const el = await t.getElement();
    expect(el.name).toBe('Demo');
    expect(f.calls).toHaveLength(2);
    expect(f.calls[0]!.auth).toBe('Bearer tok-a');
    expect(f.calls[1]!.auth).toBe('Bearer tok-b');
  });

  test('retries at most ONCE — two consecutive 401s surface as AuthError', async () => {
    const f = recordingFetch([{ status: 401, body: {} }]);
    const t = new HttpTransport({
      baseUrl: 'https://api.udp.city',
      tokens: rotatingProvider('tok-a', 'tok-b'),
      fetchImpl: f.impl,
    });

    await expect(t.getElement()).rejects.toBeInstanceOf(AuthError);
    expect(f.calls).toHaveLength(2);
  });

  // StaticTokenProvider.refresh() returns the same token, so retrying would be
  // a guaranteed-identical request. The identical-token guard skips it.
  test('does not re-send when the provider cannot actually refresh', async () => {
    const f = recordingFetch([{ status: 401, body: {} }]);
    const t = new HttpTransport({
      baseUrl: 'https://api.udp.city',
      tokens: new StaticTokenProvider(token('tok-a')),
      fetchImpl: f.impl,
    });

    await expect(t.getElement()).rejects.toBeInstanceOf(AuthError);
    expect(f.calls).toHaveLength(1);
  });

  test('retryOnUnauthorized: false opts out entirely', async () => {
    const f = recordingFetch([{ status: 401, body: {} }]);
    const t = new HttpTransport({
      baseUrl: 'https://api.udp.city',
      tokens: rotatingProvider('tok-a', 'tok-b'),
      fetchImpl: f.impl,
      retryOnUnauthorized: false,
    });

    await expect(t.getElement()).rejects.toBeInstanceOf(AuthError);
    expect(f.calls).toHaveLength(1);
  });
});

describe('non-401 errors and mapping', () => {
  test('maps other failures to GatewayError with the status', async () => {
    const f = recordingFetch([{ status: 503, body: {} }]);
    const t = new HttpTransport({
      baseUrl: 'https://api.udp.city',
      tokens: new StaticTokenProvider(token('tok-a')),
      fetchImpl: f.impl,
    });

    await expect(t.getElement()).rejects.toMatchObject({ name: 'GatewayError', status: 503 });
    await expect(t.getElement()).rejects.toBeInstanceOf(GatewayError);
  });

  test('maps queryTimeseries snake_case and defaults missing points to []', async () => {
    const f = recordingFetch([
      {
        body: {
          results: [
            { stream_id: 11, status: 200, points: [{ t: '2026-01-01T00:00:00Z', v: 1 }] },
            { stream_id: 12, status: 404, error: 'not found' },
          ],
        },
      },
    ]);
    const t = new HttpTransport({
      baseUrl: 'https://api.udp.city',
      tokens: new StaticTokenProvider(token('tok-a')),
      fetchImpl: f.impl,
    });

    const results = await t.queryTimeseries([{ streamId: 11 }, { streamId: 12 }]);
    expect(results[0]).toEqual({
      streamId: 11,
      status: 200,
      error: undefined,
      points: [{ t: '2026-01-01T00:00:00Z', v: 1 }],
    });
    expect(results[1]!.points).toEqual([]);
  });
});
