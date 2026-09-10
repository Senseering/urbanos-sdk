import { generateKeyPairSync } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import { UrbanOSServiceClient } from './index.js';

describe('UrbanOSServiceClient', () => {
  const apiKey = `uos_api_uos_sc_${'a'.repeat(24)}.uos_ss_${'b'.repeat(64)}`;

  it('uses one API key without requiring scopes or exposing it to data endpoints', async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const service = new UrbanOSServiceClient({
      baseUrl: 'https://api.udp.city',
      apiKey,
      fetchImpl: async (input, init) => {
        await Promise.resolve();
        const url = requestURL(input);
        requests.push({ url, init });
        if (url.endsWith('/oauth/token'))
          return jsonResponse({
            access_token: 'short-token',
            expires_in: 900,
            scope: 'element:read',
            element_id: 42,
          });
        return jsonResponse({ id: 42 });
      },
    });
    await Promise.all([service.forElement(42).element(), service.forElement(42).element()]);
    expect(requests.filter((request) => request.url.endsWith('/oauth/token'))).toHaveLength(1);
    expect(requests[0]?.init?.headers).toMatchObject({
      Authorization: `Basic ${Buffer.from(`uos_sc_${'a'.repeat(24)}:uos_ss_${'b'.repeat(64)}`).toString('base64')}`,
    });
    expect((requests[0]?.init?.body as URLSearchParams).has('scope')).toBe(false);
    expect(requests[0]?.init?.redirect).toBe('error');
    expect(requests[1]?.init?.headers).toMatchObject({ Authorization: 'Bearer short-token' });
  });

  it.each([
    'bad',
    '',
    apiKey + '.extra',
    apiKey.replace('uos_api_', ''),
    apiKey.replace('uos_ss_', ''),
  ])('rejects malformed keys without echoing them', (key) => {
    expect(
      () => new UrbanOSServiceClient({ baseUrl: 'https://api.udp.city', apiKey: key }),
    ).toThrow(/^Invalid urbanOS API key$/);
  });

  it('rejects insecure remote endpoints and ambiguous credentials before sending requests', () => {
    expect(() => new UrbanOSServiceClient({ baseUrl: 'http://example.com', apiKey })).toThrow(
      'HTTPS',
    );
    expect(
      () => new UrbanOSServiceClient({ baseUrl: 'https://example.com?secret=value', apiKey }),
    ).toThrow('HTTPS');
    expect(
      () =>
        new UrbanOSServiceClient({
          baseUrl: 'https://api.udp.city',
          apiKey,
          credential: { type: 'shared_secret', credentialId: 'other', clientSecret: 'other' },
          scopes: [],
        }),
    ).toThrow('not both');
  });

  it('rejects API-key browser use', () => {
    vi.stubGlobal('window', {});
    try {
      expect(() => new UrbanOSServiceClient({ baseUrl: 'https://api.udp.city', apiKey })).toThrow(
        'browser',
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('renews API-key tokens before expiry and keeps explicit scope narrowing', async () => {
    let now = Date.now();
    const clock = vi.spyOn(Date, 'now').mockImplementation(() => now);
    let tokenCalls = 0;
    const service = new UrbanOSServiceClient({
      baseUrl: 'https://api.udp.city',
      apiKey,
      scopes: ['element:read'],
      fetchImpl: async (input, init) => {
        await Promise.resolve();
        if (requestURL(input).endsWith('/oauth/token')) {
          tokenCalls++;
          expect((init?.body as URLSearchParams).get('scope')).toBe('element:read');
          return jsonResponse({
            access_token: `token-${tokenCalls}`,
            expires_in: 60,
            scope: 'element:read',
            element_id: 42,
          });
        }
        return jsonResponse({ id: 42 });
      },
    });
    try {
      await service.forElement(42).element();
      now += 31_000;
      await Promise.all([service.forElement(42).element(), service.forElement(42).element()]);
      expect(tokenCalls).toBe(2);
    } finally {
      clock.mockRestore();
    }
  });
  it('discovers identifier-only targets with a directory token', async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      await Promise.resolve();
      const url = requestURL(input);
      requests.push({ url, init });
      if (url.endsWith('/oauth/token')) {
        return jsonResponse({
          access_token: 'directory-token',
          token_type: 'Bearer',
          expires_in: 300,
          scope: 'service:targets:read',
        });
      }
      return jsonResponse({
        targets: [
          { element_id: 42, mandate_ids: [100, 101] },
          { element_id: 84, mandate_ids: [200] },
        ],
      });
    };
    const service = new UrbanOSServiceClient({
      baseUrl: 'https://api.udp.city',
      credential: {
        type: 'shared_secret',
        credentialId: 'uos_sc_citypulse',
        clientSecret: 'server-secret',
      },
      scopes: ['datasources:read', 'data:read:*'],
      fetchImpl,
    });

    await expect(service.listTargets()).resolves.toEqual([
      { elementId: 42, mandateIds: [100, 101] },
      { elementId: 84, mandateIds: [200] },
    ]);
    expect(requests[0]?.init?.headers).toMatchObject({
      Authorization: `Basic ${Buffer.from('uos_sc_citypulse:server-secret').toString('base64')}`,
    });
    expect(requests[0]?.init?.body).toBeInstanceOf(URLSearchParams);
    expect((requests[0]?.init?.body as URLSearchParams).toString()).toContain(
      'audience=urbanos-service-directory',
    );
    expect(requests[1]?.init?.headers).toEqual({ Authorization: 'Bearer directory-token' });
  });

  it('coalesces per-element acquisition and renews once after a 401', async () => {
    let tokenCalls = 0;
    let dataCalls = 0;
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = requestURL(input);
      if (url.endsWith('/oauth/token')) {
        tokenCalls += 1;
        await Promise.resolve();
        return jsonResponse({
          access_token: `element-token-${tokenCalls}`,
          token_type: 'Bearer',
          expires_in: 900,
          scope: 'element:read datasources:read storage:read',
          element_id: 42,
          mandate_ids: [100],
        });
      }
      dataCalls += 1;
      const headers = init?.headers as Record<string, string>;
      if (headers.Authorization === 'Bearer element-token-1' && dataCalls === 1) {
        return new Response(null, { status: 401 });
      }
      if (url.endsWith('/v1/element')) return jsonResponse({ id: 42, name: 'Test City' });
      if (url.endsWith('/v1/datasources')) return jsonResponse({ datasources: [] });
      if (url.endsWith('/v1/storage/preferences') && init?.method === 'PUT') {
        return jsonResponse({});
      }
      if (url.endsWith('/v1/storage/preferences')) {
        return jsonResponse({ value: { theme: 'dark' } });
      }
      throw new Error(`unexpected request ${url}`);
    };
    const service = new UrbanOSServiceClient({
      baseUrl: 'https://api.udp.city',
      credential: {
        type: 'shared_secret',
        credentialId: 'uos_sc_citypulse',
        clientSecret: 'server-secret',
      },
      scopes: ['element:read', 'datasources:read', 'storage:read'],
      fetchImpl,
    });
    const client = service.forElement(42);
    const [element, datasources] = await Promise.all([client.element(), client.datasources()]);
    await client.storage.put('preferences', { theme: 'dark' });
    const preferences = await client.storage.get('preferences');

    expect(element).toEqual({ id: 42, name: 'Test City' });
    expect(datasources).toEqual([]);
    expect(preferences).toEqual({ theme: 'dark' });
    expect(tokenCalls).toBe(2);
    expect(dataCalls).toBe(5);
  });

  it('surfaces a disabled storage scope instead of widening the token', async () => {
    const fetchImpl: typeof fetch = async (input) => {
      await Promise.resolve();
      const url = requestURL(input);
      if (url.endsWith('/oauth/token')) {
        return jsonResponse({
          access_token: 'read-only-token',
          token_type: 'Bearer',
          expires_in: 900,
          scope: 'datasources:read',
          element_id: 42,
        });
      }
      return jsonResponse({ error: 'insufficient_scope' }, 403);
    };
    const client = new UrbanOSServiceClient({
      baseUrl: 'https://api.udp.city',
      credential: {
        type: 'shared_secret',
        credentialId: 'uos_sc_read_only',
        clientSecret: 'server-secret',
      },
      scopes: ['datasources:read'],
      fetchImpl,
    }).forElement(42);

    await expect(client.storage.put('preferences', { theme: 'dark' })).rejects.toMatchObject({
      status: 403,
    });
  });

  it('signs private_key_jwt assertions for the exact token endpoint audience', async () => {
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    let assertion = '';
    const fetchImpl: typeof fetch = async (input, init) => {
      await Promise.resolve();
      if (requestURL(input).endsWith('/oauth/token')) {
        const form = init?.body as URLSearchParams;
        assertion = form.get('client_assertion') ?? '';
        return jsonResponse({
          access_token: 'directory-token',
          token_type: 'Bearer',
          expires_in: 300,
          scope: 'service:targets:read',
        });
      }
      return jsonResponse({ targets: [] });
    };
    const service = new UrbanOSServiceClient({
      baseUrl: 'https://gateway.internal',
      tokenEndpointAudience: 'https://api.udp.city/oauth/token',
      credential: {
        type: 'private_key_jwt',
        credentialId: 'uos_sc_citypulse',
        keyId: 'citypulse-key-2026',
        privateKey: pem,
      },
      scopes: ['datasources:read'],
      fetchImpl,
    });
    await expect(service.listTargets()).resolves.toEqual([]);

    const [header, payload, signature] = assertion.split('.');
    expect(JSON.parse(Buffer.from(header!, 'base64url').toString())).toMatchObject({
      alg: 'ES256',
      kid: 'citypulse-key-2026',
    });
    expect(JSON.parse(Buffer.from(payload!, 'base64url').toString())).toMatchObject({
      iss: 'uos_sc_citypulse',
      sub: 'uos_sc_citypulse',
      aud: 'https://api.udp.city/oauth/token',
    });
    expect(Buffer.from(signature!, 'base64url')).toHaveLength(64);
  });

  it('rejects browser runtime use before any credential leaves the process', () => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', { value: {}, configurable: true });
    try {
      expect(
        () =>
          new UrbanOSServiceClient({
            baseUrl: 'https://api.udp.city',
            credential: {
              type: 'shared_secret',
              credentialId: 'uos_sc_x',
              clientSecret: 'secret',
            },
            scopes: ['datasources:read'],
          }),
      ).toThrow('cannot run in a browser');
    } finally {
      if (previous) Object.defineProperty(globalThis, 'window', previous);
      else Reflect.deleteProperty(globalThis, 'window');
    }
  });
});

function requestURL(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
