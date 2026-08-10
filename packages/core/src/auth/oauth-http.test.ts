import { describe, expect, test } from 'vitest';
import { OAuthHttp } from './oauth-http';
import { base64UrlEncode } from './pkce';

function jwt(payload: Record<string, unknown>): string {
  const b = (o: unknown) => base64UrlEncode(new TextEncoder().encode(JSON.stringify(o)));
  return `${b({ alg: 'ES256' })}.${b(payload)}.sig`;
}

/** A fetch double that replies with one JSON body. */
function fakeFetch(body: unknown): typeof fetch {
  const impl: typeof fetch = () =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  return impl;
}

const BASE = {
  access_token: jwt({ el: 42, mid: 7 }),
  token_type: 'Bearer',
  expires_in: 900,
  scope: 'element:read',
};

describe('OAuthHttp.toAccessToken — mandate', () => {
  test('maps the explicit mandate_id field', async () => {
    const http = new OAuthHttp({
      gatewayUrl: 'https://api.udp.city',
      fetchImpl: fakeFetch({ ...BASE, element_id: 42, mandate_id: 99 }),
      clock: () => 1_000,
    });
    const { token } = await http.token({});
    expect(token.mandateId).toBe(99);
    expect(token.tenantId).toBe(42);
  });

  test('falls back to decoding the mid claim when mandate_id is absent', async () => {
    const http = new OAuthHttp({
      gatewayUrl: 'https://api.udp.city',
      fetchImpl: fakeFetch(BASE), // no mandate_id; token carries mid: 7
      clock: () => 1_000,
    });
    const { token } = await http.token({});
    expect(token.mandateId).toBe(7);
  });

  test('leaves mandateId undefined when neither is present', async () => {
    const http = new OAuthHttp({
      gatewayUrl: 'https://api.udp.city',
      fetchImpl: fakeFetch({ ...BASE, access_token: jwt({ el: 42 }) }),
      clock: () => 1_000,
    });
    const { token } = await http.token({});
    expect(token.mandateId).toBeUndefined();
  });
});
