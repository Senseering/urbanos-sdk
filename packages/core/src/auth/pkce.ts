/**
 * PKCE primitives (RFC 7636), matching the gateway's `pkceS256` exactly:
 * base64url(SHA-256(verifier)), unpadded. The gateway supports S256 only — there
 * is no `plain` fallback and `code_challenge_method` is never read server-side.
 */
import type { CryptoLike } from './env';

const B64URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** Unpadded base64url (RFC 4648 §5). Hand-rolled so core needs no btoa/Buffer. */
export function base64UrlEncode(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]!;
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64URL_ALPHABET[b0 >> 2]!;
    out += B64URL_ALPHABET[((b0 & 0x03) << 4) | ((b1 ?? 0) >> 4)]!;
    if (b1 === undefined) break;
    out += B64URL_ALPHABET[((b1 & 0x0f) << 2) | ((b2 ?? 0) >> 6)]!;
    if (b2 === undefined) break;
    out += B64URL_ALPHABET[b2 & 0x3f]!;
  }
  return out;
}

export function base64UrlDecode(s: string): Uint8Array {
  const clean = s.replace(/-/g, '+').replace(/_/g, '/');
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of clean) {
    if (ch === '=') break;
    const idx = B64URL_ALPHABET.indexOf(ch === '+' ? '-' : ch === '/' ? '_' : ch);
    if (idx < 0) continue;
    buffer = (buffer << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(bytes);
}

/** 32 random bytes → a 43-char unreserved string (RFC 7636 §4.1). */
export function createCodeVerifier(crypto: CryptoLike): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
}

/** base64url(SHA-256(verifier)) — byte-identical to the gateway's pkceS256. */
export async function createCodeChallenge(crypto: CryptoLike, verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

/** 32 random bytes → an opaque CSRF state value. */
export function createState(crypto: CryptoLike): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
}

/**
 * Read the `el` (element) claim from an access token's payload.
 *
 * ⚠️ This is a DECODE, NOT A VERIFICATION. The gateway signs the token and
 * verifies it on every request; this only populates the client-side
 * `AccessToken.tenantId` hint so an app knows which tenant it is talking to.
 * NEVER gate anything on the result.
 *
 * Why decode rather than carry element_id through the redirect: the `el` claim
 * is what the gateway's authz wall actually enforces. Trusting an unauthenticated
 * URL parameter instead would let a client believe it is tenant 7 while its token
 * is bound to 42 — every request then 403s with no diagnosable cause.
 *
 * Returns 0 when the claim is absent or unparseable; callers treat that as
 * "unknown" rather than failing the sign-in.
 */
export function readElementClaim(accessToken: string): number {
  const parts = accessToken.split('.');
  if (parts.length < 2) return 0;
  try {
    const json = new TextDecoder().decode(base64UrlDecode(parts[1]!));
    const payload = JSON.parse(json) as { el?: unknown };
    return typeof payload.el === 'number' && Number.isFinite(payload.el) ? payload.el : 0;
  } catch {
    return 0;
  }
}
