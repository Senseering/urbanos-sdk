/**
 * Injection seams for the browser APIs the PKCE flow needs.
 *
 * `@senseering/urbanos-core` has zero runtime dependencies and touches no
 * platform API except an injectable `fetch` — a hard rule (CONTRIBUTING.md).
 * PKCE needs SHA-256, random bytes, persistence across a full-page redirect, and
 * navigation, none of which exist in Node's default test environment.
 *
 * The precedent is `packages/bridge/src/channel.ts`: declare the API
 * STRUCTURALLY, and provide a default that THROWS with a "pass opts.x" message
 * rather than assuming a browser. That keeps the package DOM-lib-free and
 * testable under Vitest's node environment with no jsdom.
 *
 * Deliberately NOT seams: `URL`, `URLSearchParams` and `TextEncoder` are WHATWG
 * globals present in Node >= 18 and every browser, so they are used directly.
 * `btoa`/`atob` are avoided entirely — base64url is hand-rolled in pkce.ts,
 * which also gives us the decoder needed to read a JWT claim.
 */

/** The subset of WebCrypto PKCE needs. Satisfied by `globalThis.crypto`. */
export interface CryptoLike {
  getRandomValues<T extends Uint8Array>(array: T): T;
  subtle: {
    digest(algorithm: 'SHA-256', data: ArrayBufferView | ArrayBuffer): Promise<ArrayBuffer>;
  };
}

/** The subset of Storage the redirect round-trip needs. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Current-URL access plus navigation.
 *
 * Methods, not a snapshot: `location.href` is a live getter, and a value
 * captured at construction time would be stale by the time the browser comes
 * back from the consent screen.
 */
export interface LocationLike {
  /** The full current URL, including the query string. */
  href(): string;
  /** Full-page navigation — the redirect out to the shell's consent screen. */
  assign(url: string): void;
  /** Rewrite the current URL without navigating. Used to scrub `code`/`state`. */
  replaceUrl(url: string): void;
}

/** Wall clock in epoch ms, injectable so expiry is testable without fake timers. */
export type ClockLike = () => number;

interface GlobalWithCrypto {
  crypto?: CryptoLike;
  sessionStorage?: StorageLike;
  location?: { href: string; assign(url: string): void };
  history?: { replaceState(data: unknown, unused: string, url: string): void };
}

function g(): GlobalWithCrypto {
  // `globalThis` already structurally satisfies GlobalWithCrypto under the DOM
  // lib, so no assertion is needed (and the linter rejects a redundant one).
  return globalThis;
}

/** The ambient WebCrypto. Present in every browser and Node >= 19. */
export function globalCrypto(): CryptoLike {
  const c: CryptoLike | undefined = g().crypto;
  if (!c?.subtle || typeof c.getRandomValues !== 'function') {
    throw new Error('pkce: no global crypto; pass opts.crypto');
  }
  return c;
}

/**
 * The ambient sessionStorage.
 *
 * sessionStorage rather than localStorage on purpose: the PKCE transaction must
 * survive a full-page navigation (that is the whole point) but must not outlive
 * the tab or leak across tabs — each tab runs its own flow, and a stale verifier
 * from another tab would corrupt the exchange.
 */
export function globalSessionStorage(): StorageLike {
  const s = g().sessionStorage;
  if (!s) throw new Error('pkce: no sessionStorage; pass opts.storage');
  return s;
}

/** The ambient location + history. */
export function browserLocation(): LocationLike {
  const loc = g().location;
  const hist = g().history;
  if (!loc) throw new Error('pkce: no global location; pass opts.location');
  return {
    href: () => loc.href,
    assign: (url) => loc.assign(url),
    replaceUrl: (url) => {
      // Scrubbing the spent code from the URL is mandatory, not cosmetic — see
      // PkceTokenProvider.completeAuthorization. Fall back to assign() only if
      // history is unavailable, which would reload but still remove the code.
      if (hist) hist.replaceState(null, '', url);
      else loc.assign(url);
    },
  };
}

/**
 * An in-memory StorageLike. SSR-safe, and the fake the tests use — the same dual
 * role `linkedChannels()` plays in the bridge package, so it ships as a real
 * export rather than a test helper.
 */
export function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}
