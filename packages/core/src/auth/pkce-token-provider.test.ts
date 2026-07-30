import { describe, expect, test } from 'vitest';
import { PkceTokenProvider } from './pkce-token-provider';
import { memoryStorage, type LocationLike } from './env';
import { seededCrypto } from './pkce.test';
import { base64UrlEncode } from './pkce';
import { AuthError } from '../errors/errors';

// ─── Hand-written fakes (structural injection; no vi.fn in this repo) ────────

function fakeLocation(initial: string): LocationLike & { assigned: string[]; current: string } {
  const f = {
    current: initial,
    assigned: [] as string[],
    href: () => f.current,
    assign: (url: string) => {
      f.assigned.push(url);
      f.current = url;
    },
    replaceUrl: (url: string) => {
      f.current = url;
    },
  };
  return f;
}

function manualClock(start = 1_700_000_000_000) {
  let now = start;
  return { now: () => now, advance: (ms: number) => (now += ms) };
}

function jwtWithEl(el: number): string {
  const b = (o: unknown) => base64UrlEncode(new TextEncoder().encode(JSON.stringify(o)));
  return `${b({ alg: 'ES256' })}.${b({ el, azp: 'uos_c_test' })}.sig`;
}

interface Recorded {
  url: string;
  body: Record<string, string>;
}

/** A fetch double that records every call and replays queued responses. */
function fakeFetch(responses: Array<{ status?: number; body: unknown }>) {
  const calls: Recorded[] = [];
  let i = 0;
  const impl = ((url: string | URL, init?: RequestInit) => {
    calls.push({
      url: String(url),
      body: JSON.parse(typeof init?.body === 'string' ? init.body : '{}') as Record<string, string>,
    });
    const r = responses[Math.min(i++, responses.length - 1)]!;
    return Promise.resolve(
      new Response(JSON.stringify(r.body), {
        status: r.status ?? 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  }) as unknown as typeof fetch;
  return { impl, calls };
}

/**
 * beginAuthorization() never resolves — the browser is navigating — and it awaits
 * a real crypto.subtle.digest first. So wait on the observable effect (the
 * navigation) rather than a fixed number of microtask ticks.
 */
async function waitForRedirect(location: { assigned: string[] }): Promise<string> {
  for (let i = 0; i < 100 && location.assigned.length === 0; i++) {
    await new Promise((r) => setTimeout(r, 0));
  }
  if (!location.assigned.length) throw new Error('beginAuthorization never navigated');
  return location.assigned[0]!;
}

const OK_TOKEN = {
  access_token: jwtWithEl(42),
  token_type: 'Bearer',
  expires_in: 900,
  scope: 'profile:read element:read',
  refresh_token: 'refresh-1',
  element_id: 42,
};

function makeProvider(
  opts: {
    location?: ReturnType<typeof fakeLocation>;
    fetch?: typeof fetch;
    clock?: () => number;
    storage?: ReturnType<typeof memoryStorage>;
    elementId?: number;
  } = {},
) {
  const location = opts.location ?? fakeLocation('https://app.example.com/callback');
  const storage = opts.storage ?? memoryStorage();
  const provider = new PkceTokenProvider({
    gatewayUrl: 'https://api.udp.city',
    shellUrl: 'https://udp.city',
    clientId: 'uos_c_test',
    redirectUri: 'https://app.example.com/callback',
    scopes: ['profile:read', 'element:read'],
    elementId: opts.elementId,
    crypto: seededCrypto(),
    storage,
    location,
    clock: opts.clock,
    fetchImpl: opts.fetch,
  });
  return { provider, location, storage };
}

describe('beginAuthorization', () => {
  test('navigates to the shell with every required parameter', async () => {
    const { provider, location, storage } = makeProvider();
    void provider.beginAuthorization();
    const assigned = await waitForRedirect(location);

    expect(location.assigned).toHaveLength(1);
    const url = new URL(assigned);
    expect(url.origin + url.pathname).toBe('https://udp.city/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('uos_c_test');
    expect(url.searchParams.get('redirect_uri')).toBe('https://app.example.com/callback');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toBeTruthy();
    expect(url.searchParams.get('state')).toBeTruthy();
    expect(url.searchParams.get('scope')).toBe('profile:read element:read');

    // The verifier + state are persisted for the return leg.
    const tx = JSON.parse(storage.getItem('urbanos.pkce.tx')!) as Record<string, string>;
    expect(tx.verifier).toBeTruthy();
    expect(tx.state).toBe(url.searchParams.get('state'));
    expect(tx.redirectUri).toBe('https://app.example.com/callback');
  });
});

describe('completeAuthorization', () => {
  async function primed(overrides: Parameters<typeof makeProvider>[0] = {}) {
    const setup = makeProvider(overrides);
    void setup.provider.beginAuthorization();
    const state = new URL(await waitForRedirect(setup.location)).searchParams.get('state')!;
    return { ...setup, state };
  }

  test('returns null when the URL is not a callback', async () => {
    const { provider } = makeProvider({ location: fakeLocation('https://app.example.com/') });
    expect(await provider.completeAuthorization()).toBeNull();
  });

  test('exchanges the code and yields a usable token', async () => {
    const f = fakeFetch([{ body: OK_TOKEN }]);
    const clock = manualClock();
    const { provider, location, state } = await primed({ fetch: f.impl, clock: clock.now });

    location.current = `https://app.example.com/callback?code=abc&state=${encodeURIComponent(state)}`;
    const token = await provider.completeAuthorization();

    expect(token).not.toBeNull();
    expect(f.calls).toHaveLength(1);
    expect(f.calls[0]!.url).toBe('https://api.udp.city/oauth/token');
    expect(f.calls[0]!.body.grant_type).toBe('authorization_code');
    expect(f.calls[0]!.body.code).toBe('abc');
    // Replays the STORED redirect_uri, not one re-derived from location.
    expect(f.calls[0]!.body.redirect_uri).toBe('https://app.example.com/callback');
    expect(f.calls[0]!.body.code_verifier).toBeTruthy();

    // expires_in is SECONDS → expiresAt is epoch ms.
    expect(token!.expiresAt).toBe(clock.now() + 900_000);
    // scope is a SPACE-DELIMITED string → scopes is an array.
    expect(token!.scopes).toEqual(['profile:read', 'element:read']);
    expect(token!.tenantId).toBe(42);
  });

  test('scrubs code and state from the URL — the code is spent', async () => {
    const f = fakeFetch([{ body: OK_TOKEN }]);
    const { provider, location, state } = await primed({ fetch: f.impl });
    location.current = `https://app.example.com/callback?code=abc&state=${encodeURIComponent(state)}&keep=1`;

    await provider.completeAuthorization();

    const after = new URL(location.current);
    expect(after.searchParams.get('code')).toBeNull();
    expect(after.searchParams.get('state')).toBeNull();
    expect(after.searchParams.get('keep')).toBe('1');
  });

  // The real CSRF assertion: a bad state must never reach the network.
  test('rejects a state mismatch WITHOUT making a token request', async () => {
    const f = fakeFetch([{ body: OK_TOKEN }]);
    const { provider, location } = await primed({ fetch: f.impl });
    location.current = 'https://app.example.com/callback?code=abc&state=not-the-state';

    await expect(provider.completeAuthorization()).rejects.toBeInstanceOf(AuthError);
    expect(f.calls).toHaveLength(0);
  });

  test('a second call cannot re-exchange the code (double-mount safety)', async () => {
    const f = fakeFetch([{ body: OK_TOKEN }]);
    const { provider, location, state } = await primed({ fetch: f.impl });
    const url = `https://app.example.com/callback?code=abc&state=${encodeURIComponent(state)}`;

    location.current = url;
    await provider.completeAuthorization();
    location.current = url; // simulate a stray second invocation

    await expect(provider.completeAuthorization()).rejects.toBeInstanceOf(AuthError);
    expect(f.calls).toHaveLength(1);
  });

  test('surfaces ?error=access_denied as an AuthError', async () => {
    const f = fakeFetch([{ body: OK_TOKEN }]);
    const { provider, location } = await primed({ fetch: f.impl });
    location.current = 'https://app.example.com/callback?error=access_denied&state=x';

    await expect(provider.completeAuthorization()).rejects.toBeInstanceOf(AuthError);
    expect(f.calls).toHaveLength(0);
  });

  test('rejects a token bound to a different element than requested', async () => {
    const f = fakeFetch([{ body: { ...OK_TOKEN, element_id: 999, access_token: jwtWithEl(999) } }]);
    const { provider, location, state } = await primed({ fetch: f.impl, elementId: 42 });
    location.current = `https://app.example.com/callback?code=abc&state=${encodeURIComponent(state)}`;

    await expect(provider.completeAuthorization()).rejects.toThrow(/bound to element 999/);
  });
});

describe('getToken / refresh', () => {
  async function authed(fetchImpl: typeof fetch, clock: ReturnType<typeof manualClock>) {
    const setup = makeProvider({ fetch: fetchImpl, clock: clock.now });
    void setup.provider.beginAuthorization();
    const state = new URL(await waitForRedirect(setup.location)).searchParams.get('state')!;
    setup.location.current = `https://app.example.com/callback?code=abc&state=${encodeURIComponent(state)}`;
    await setup.provider.completeAuthorization();
    return setup;
  }

  test('serves the cached token inside the skew window', async () => {
    const f = fakeFetch([{ body: OK_TOKEN }]);
    const clock = manualClock();
    const { provider } = await authed(f.impl, clock);

    await provider.getToken();
    await provider.getToken();
    expect(f.calls).toHaveLength(1); // only the initial code exchange
  });

  test('refreshes once the token enters the skew window', async () => {
    const f = fakeFetch([
      { body: OK_TOKEN },
      { body: { ...OK_TOKEN, refresh_token: 'refresh-2' } },
    ]);
    const clock = manualClock();
    const { provider } = await authed(f.impl, clock);

    clock.advance(900_000 - 30_000); // inside the 60s default skew
    await provider.getToken();

    expect(f.calls).toHaveLength(2);
    expect(f.calls[1]!.body.grant_type).toBe('refresh_token');
    expect(f.calls[1]!.body.refresh_token).toBe('refresh-1');
    // RFC 6749 §6 requires client_id for public clients.
    expect(f.calls[1]!.body.client_id).toBe('uos_c_test');
  });

  // ── Encodes the family-revocation constraint as an executable invariant ────
  // The gateway deletes every token in a rotation family on reuse, so two
  // concurrent refreshes would kill the session. Coalescing is correctness.
  test('coalesces concurrent refreshes into exactly ONE token request', async () => {
    const f = fakeFetch([
      { body: OK_TOKEN },
      { body: { ...OK_TOKEN, refresh_token: 'refresh-2' } },
    ]);
    const clock = manualClock();
    const { provider } = await authed(f.impl, clock);

    clock.advance(900_000);
    const results = await Promise.all([
      provider.getToken(),
      provider.getToken(),
      provider.getToken(),
      provider.getToken(),
      provider.getToken(),
    ]);

    expect(f.calls).toHaveLength(2); // 1 exchange + 1 refresh, not 1 + 5
    expect(new Set(results.map((r) => r.accessToken)).size).toBe(1);
  });

  test('rotates: the second refresh sends the NEW refresh token', async () => {
    const f = fakeFetch([
      { body: OK_TOKEN },
      { body: { ...OK_TOKEN, refresh_token: 'refresh-2' } },
      { body: { ...OK_TOKEN, refresh_token: 'refresh-3' } },
    ]);
    const clock = manualClock();
    const { provider } = await authed(f.impl, clock);

    clock.advance(900_000);
    await provider.getToken();
    clock.advance(900_000);
    await provider.refresh();

    expect(f.calls[1]!.body.refresh_token).toBe('refresh-1');
    expect(f.calls[2]!.body.refresh_token).toBe('refresh-2');
  });

  test('invalid_grant clears the session and stops making requests', async () => {
    const f = fakeFetch([{ body: OK_TOKEN }, { status: 400, body: { error: 'invalid_grant' } }]);
    const clock = manualClock();
    const { provider } = await authed(f.impl, clock);

    clock.advance(900_000);
    await expect(provider.getToken()).rejects.toBeInstanceOf(AuthError);
    expect(provider.isAuthenticated()).toBe(false);

    const before = f.calls.length;
    await expect(provider.getToken()).rejects.toBeInstanceOf(AuthError);
    expect(f.calls).toHaveLength(before); // no further network traffic
  });

  test('getToken throws rather than redirecting when unauthenticated', async () => {
    const { provider, location } = makeProvider();
    await expect(provider.getToken()).rejects.toBeInstanceOf(AuthError);
    expect(location.assigned).toHaveLength(0);
  });
});
