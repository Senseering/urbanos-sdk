/**
 * PkceTokenProvider — OAuth 2.1 authorization-code + PKCE for STANDALONE apps.
 *
 * The flow is shell-mediated by design. The gateway's `POST /oauth/authorize`
 * requires the user's platform session as `subject_token`, which a third party
 * must never see, so the browser is redirected to the urbanOS shell's consent
 * screen instead. The shell holds the session, calls the gateway, and 302s back
 * here with a code.
 *
 *   app → shell /oauth/authorize?… → (consent) → app /callback?code&state
 *   app → gateway POST /oauth/token {code, code_verifier} → tokens
 */
import { AuthError, TenantError } from '../errors/errors';
import type { AccessToken, TokenProvider } from './token-provider';
import {
  browserLocation,
  globalCrypto,
  globalSessionStorage,
  memoryStorage,
  type ClockLike,
  type CryptoLike,
  type LocationLike,
  type StorageLike,
} from './env';
import { createCodeChallenge, createCodeVerifier, createState, readElementClaim } from './pkce';
import { OAuthHttp } from './oauth-http';

const TX_KEY = 'urbanos.pkce.tx';
const REFRESH_KEY = 'urbanos.pkce.refresh';
/** Matches the gateway's 10-minute authorization-code TTL. */
const TX_MAX_AGE_MS = 10 * 60_000;

interface PendingTx {
  verifier: string;
  state: string;
  redirectUri: string;
  elementId?: number;
  createdAt: number;
}

export interface PkceTokenProviderOptions {
  /** Gateway origin, e.g. "https://urbanos-gateway.udp.city". No trailing slash. */
  gatewayUrl: string;
  /** urbanOS shell origin hosting the consent screen, e.g. "https://urbanos.udp.city". */
  shellUrl: string;
  /** The gateway client id (`uos_c_…`) — NOT the reverse-DNS manifest id. */
  clientId: string;
  /**
   * Must be byte-identical to a registered redirect URI: the gateway compares
   * with `==` at authorize AND at redemption. Required explicitly rather than
   * derived from location, which silently breaks on trailing slashes.
   */
  redirectUri: string;
  /** Requested scopes. The gateway intersects with grant ∩ tier ceiling. */
  scopes?: string[];
  /** Element to authorize against. Omit to let the shell show its picker. */
  elementId?: number;

  /** Refresh this many ms before expiry. Default 60_000. */
  expirySkewMs?: number;
  /**
   * Where the refresh token lives. Default 'memory'.
   *
   * Memory by default because with XSS a persisted refresh token is a 30-day
   * offline credential exfiltrable in one line. In memory it is bounded by the
   * tab and unreadable by a later-loading script, and it sidesteps cross-tab
   * family revocation entirely. The reload cost is a flicker, not a re-login:
   * the user has already consented, so the shell can auto-approve and 302
   * straight back.
   */
  refreshTokenStorage?: 'memory' | StorageLike;

  crypto?: CryptoLike;
  /** Holds verifier + state across the redirect. Default: sessionStorage. */
  storage?: StorageLike;
  location?: LocationLike;
  clock?: ClockLike;
  fetchImpl?: typeof fetch;
}

export class PkceTokenProvider implements TokenProvider {
  private readonly http: OAuthHttp;
  private readonly clock: ClockLike;
  private readonly skewMs: number;
  private readonly refreshStore: StorageLike;

  private cached: AccessToken | null = null;
  private inflight: Promise<AccessToken> | null = null;

  private crypto_?: CryptoLike;
  private storage_?: StorageLike;
  private location_?: LocationLike;

  constructor(private readonly opts: PkceTokenProviderOptions) {
    if (!/^https?:\/\//.test(opts.redirectUri)) {
      throw new Error('PkceTokenProvider: redirectUri must be an absolute URL');
    }
    this.clock = opts.clock ?? Date.now;
    this.skewMs = opts.expirySkewMs ?? 60_000;
    this.refreshStore =
      opts.refreshTokenStorage && opts.refreshTokenStorage !== 'memory'
        ? opts.refreshTokenStorage
        : memoryStorage();
    this.http = new OAuthHttp({
      gatewayUrl: opts.gatewayUrl,
      fetchImpl: opts.fetchImpl,
      clock: this.clock,
    });
  }

  // Seams are resolved lazily so constructing the provider during SSR (where
  // there is no crypto/location) does not throw — only using it does.
  private get crypto(): CryptoLike {
    return (this.crypto_ ??= this.opts.crypto ?? globalCrypto());
  }
  private get storage(): StorageLike {
    return (this.storage_ ??= this.opts.storage ?? globalSessionStorage());
  }
  private get location(): LocationLike {
    return (this.location_ ??= this.opts.location ?? browserLocation());
  }

  /**
   * Start the flow: mint verifier + state, persist them, navigate to the shell.
   * Never resolves — the page is going away.
   */
  async beginAuthorization(): Promise<never> {
    const verifier = createCodeVerifier(this.crypto);
    const state = createState(this.crypto);
    const challenge = await createCodeChallenge(this.crypto, verifier);

    const tx: PendingTx = {
      verifier,
      state,
      redirectUri: this.opts.redirectUri,
      elementId: this.opts.elementId,
      createdAt: this.clock(),
    };
    this.storage.setItem(TX_KEY, JSON.stringify(tx));

    const url = new URL('/oauth/authorize', this.opts.shellUrl);
    url.searchParams.set('client_id', this.opts.clientId);
    url.searchParams.set('redirect_uri', this.opts.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('code_challenge', challenge);
    // Sent even though the gateway never reads it: the URL stays self-describing
    // and forward-compatible if `plain` is ever rejected explicitly.
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('state', state);
    if (this.opts.scopes?.length) url.searchParams.set('scope', this.opts.scopes.join(' '));
    if (this.opts.elementId !== undefined) {
      url.searchParams.set('element_id', String(this.opts.elementId));
    }

    this.location.assign(url.toString());
    // The browser is navigating; nothing after this runs.
    return new Promise<never>(() => {});
  }

  /**
   * Finish the flow if the current URL is a callback. Returns null when it is
   * not, so an app can call this unconditionally at boot.
   */
  async completeAuthorization(): Promise<AccessToken | null> {
    const current = new URL(this.location.href());
    const code = current.searchParams.get('code');
    const error = current.searchParams.get('error');
    const state = current.searchParams.get('state');
    if (!code && !error) return null;

    // Load AND DELETE the transaction before any await. Doing this synchronously
    // makes a double mount (React StrictMode, a stray second call) impossible to
    // turn into two code exchanges: the second call finds no tx and fails the
    // state check without ever touching the network.
    const raw = this.storage.getItem(TX_KEY);
    this.storage.removeItem(TX_KEY);

    if (error) {
      this.scrubUrl(current);
      throw new AuthError(current.searchParams.get('error_description') ?? error);
    }

    let tx: PendingTx | null = null;
    try {
      tx = raw ? (JSON.parse(raw) as PendingTx) : null;
    } catch {
      tx = null;
    }

    // CSRF gate. A mismatch must emit NO network request at all.
    if (!tx || !state || state !== tx.state) {
      this.scrubUrl(current);
      throw new AuthError('pkce: state mismatch');
    }
    if (!code) {
      // Unreachable: the `!code && !error` early-return and the `error` throw
      // above cover both cases. Kept so `code` narrows to string.
      this.scrubUrl(current);
      throw new AuthError('pkce: callback has no authorization code');
    }
    if (this.clock() - tx.createdAt > TX_MAX_AGE_MS) {
      this.scrubUrl(current);
      throw new AuthError('pkce: authorization request expired');
    }

    const { token, refresh } = await this.http.token({
      grant_type: 'authorization_code',
      client_id: this.opts.clientId,
      code,
      // Replay the STORED URI verbatim. Re-deriving it from location breaks on
      // trailing slashes and locale prefixes and yields an opaque invalid_grant.
      redirect_uri: tx.redirectUri,
      code_verifier: tx.verifier,
    });

    if (tx.elementId !== undefined) {
      const bound = token.tenantId || readElementClaim(token.accessToken);
      if (bound && bound !== tx.elementId) {
        throw new TenantError(
          `pkce: token is bound to element ${bound}, requested ${tx.elementId}`,
        );
      }
    }

    this.cached = token;
    if (refresh) this.refreshStore.setItem(REFRESH_KEY, refresh);

    // Mandatory, not cosmetic: the code is spent, so a reload or back-button
    // would retry it into invalid_grant. It also keeps the code out of Referer
    // headers, server logs and analytics.
    this.scrubUrl(current);
    return token;
  }

  private scrubUrl(current: URL): void {
    for (const p of ['code', 'state', 'error', 'error_description', 'element_id']) {
      current.searchParams.delete(p);
    }
    this.location.replaceUrl(current.toString());
  }

  /**
   * A valid cached token, refreshing if it is inside the skew window.
   *
   * Deliberately NEVER redirects. Navigating away from inside a data call
   * destroys unsaved app state and is untestable; the AuthError is the signal
   * and the app decides:
   *
   *   try { await client.datasources() }
   *   catch (e) { if (e instanceof AuthError) await auth.beginAuthorization() }
   */
  async getToken(): Promise<AccessToken> {
    if (this.cached && this.clock() < this.cached.expiresAt - this.skewMs) {
      return this.cached;
    }
    if (this.refreshStore.getItem(REFRESH_KEY)) return this.refresh();
    if (this.cached) return this.cached; // no refresh token; use it until it 401s
    throw new AuthError('not authenticated');
  }

  /**
   * Force a refresh. Concurrent calls share ONE in-flight request.
   *
   * This coalescing is a CORRECTNESS requirement, not an optimisation: the
   * gateway marks a refresh token used and, on a second use, deletes every token
   * in the same rotation family. Two concurrent refreshes would kill the
   * session. Coalescing lives here rather than in HttpTransport so that N
   * parallel 401s across N endpoints still collapse to one network call.
   */
  refresh(): Promise<AccessToken> {
    if (this.inflight) return this.inflight;
    this.inflight = this.doRefresh().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private async doRefresh(): Promise<AccessToken> {
    const refreshToken = this.refreshStore.getItem(REFRESH_KEY);
    if (!refreshToken) throw new AuthError('not authenticated');

    try {
      const { token, refresh } = await this.http.token({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        // RFC 6749 §6 requires client_id for public clients.
        client_id: this.opts.clientId,
      });
      this.cached = token;
      // Swap the rotated token in before resolving.
      if (refresh) this.refreshStore.setItem(REFRESH_KEY, refresh);
      return token;
    } catch (e) {
      // invalid_grant means the family was revoked or expired: the session is
      // gone. Clear everything so the app falls into its normal re-auth path
      // instead of looping. NEVER retry a refresh.
      if (e instanceof AuthError) this.logout();
      throw e;
    }
  }

  /** True when a cached token or a refresh token exists. */
  isAuthenticated(): boolean {
    return !!this.cached || !!this.refreshStore.getItem(REFRESH_KEY);
  }

  /**
   * Drop all local state. Local only — the gateway exposes no revocation
   * endpoint, so outstanding tokens live out their TTL.
   */
  logout(): void {
    this.cached = null;
    this.refreshStore.removeItem(REFRESH_KEY);
    try {
      this.storage.removeItem(TX_KEY);
    } catch {
      /* storage may be unavailable during teardown */
    }
  }
}
