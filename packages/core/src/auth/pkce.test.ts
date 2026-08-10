import { describe, expect, test } from 'vitest';
import {
  base64UrlDecode,
  base64UrlEncode,
  createCodeChallenge,
  createCodeVerifier,
  createState,
  readElementClaim,
  readMandateClaim,
} from './pkce';
import type { CryptoLike } from './env';

/**
 * A deterministic CryptoLike: counter-filled randomness, but the REAL
 * SHA-256 from the ambient WebCrypto (Node >= 19). Structural injection, per the
 * repo convention — there is no vi.fn()/vi.mock anywhere in this codebase.
 */
export function seededCrypto(seed = 0): CryptoLike {
  let n = seed;
  return {
    getRandomValues<T extends Uint8Array>(array: T): T {
      for (let i = 0; i < array.length; i++) array[i] = n = (n + 37) & 0xff;
      return array;
    },
    subtle: (globalThis.crypto as unknown as CryptoLike).subtle,
  };
}

describe('base64url', () => {
  test('encodes without padding and with the URL-safe alphabet', () => {
    expect(base64UrlEncode(new Uint8Array([251, 255, 190]))).toBe('-_--');
    expect(base64UrlEncode(new Uint8Array([0]))).toBe('AA');
    expect(base64UrlEncode(new Uint8Array([0, 0]))).toBe('AAA');
    expect(base64UrlEncode(new Uint8Array([]))).toBe('');
  });

  test('round-trips arbitrary bytes', () => {
    for (const len of [1, 2, 3, 4, 31, 32, 33]) {
      const bytes = Uint8Array.from({ length: len }, (_, i) => (i * 7 + 3) & 0xff);
      expect(Array.from(base64UrlDecode(base64UrlEncode(bytes)))).toEqual(Array.from(bytes));
    }
  });
});

describe('PKCE S256', () => {
  // ── The single most valuable test in this package ──────────────────────────
  // RFC 7636 Appendix B known-answer vector. Because the gateway's pkceS256 is
  // base64url(SHA-256(verifier)) unpadded, passing this pins Go↔TS PKCE parity
  // for free — the same role the classify/aggregation conformance vectors play.
  test('matches the RFC 7636 Appendix B vector (and therefore the gateway)', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const challenge = await createCodeChallenge(seededCrypto(), verifier);
    expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  test('produces a verifier of legal length and charset (RFC 7636 §4.1)', () => {
    const v = createCodeVerifier(seededCrypto());
    expect(v.length).toBeGreaterThanOrEqual(43);
    expect(v.length).toBeLessThanOrEqual(128);
    expect(v).toMatch(/^[A-Za-z0-9\-._~]+$/);
  });

  test('state is opaque and 43 chars from 32 random bytes', () => {
    expect(createState(seededCrypto()).length).toBe(43);
  });
});

describe('readElementClaim', () => {
  function jwt(payload: Record<string, unknown>): string {
    const b = (o: unknown) => base64UrlEncode(new TextEncoder().encode(JSON.stringify(o)));
    return `${b({ alg: 'ES256' })}.${b(payload)}.signature`;
  }

  test('reads the el claim', () => {
    expect(readElementClaim(jwt({ el: 42, azp: 'uos_c_x' }))).toBe(42);
  });

  test('returns 0 for a missing, non-numeric or malformed claim', () => {
    expect(readElementClaim(jwt({ azp: 'x' }))).toBe(0);
    expect(readElementClaim(jwt({ el: 'forty-two' }))).toBe(0);
    expect(readElementClaim('not-a-jwt')).toBe(0);
    expect(readElementClaim('a.!!!not-base64!!!.c')).toBe(0);
    expect(readElementClaim('')).toBe(0);
  });
});

describe('readMandateClaim', () => {
  function jwt(payload: Record<string, unknown>): string {
    const b = (o: unknown) => base64UrlEncode(new TextEncoder().encode(JSON.stringify(o)));
    return `${b({ alg: 'ES256' })}.${b(payload)}.signature`;
  }

  test('reads the mid claim', () => {
    expect(readMandateClaim(jwt({ el: 42, mid: 7 }))).toBe(7);
  });

  test('treats 0 (instance-level) as undefined', () => {
    expect(readMandateClaim(jwt({ el: 42, mid: 0 }))).toBeUndefined();
  });

  test('returns undefined for a missing, non-numeric or malformed claim', () => {
    expect(readMandateClaim(jwt({ el: 42 }))).toBeUndefined();
    expect(readMandateClaim(jwt({ mid: 'seven' }))).toBeUndefined();
    expect(readMandateClaim('not-a-jwt')).toBeUndefined();
    expect(readMandateClaim('a.!!!not-base64!!!.c')).toBeUndefined();
    expect(readMandateClaim('')).toBeUndefined();
  });
});
