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
import { AuthError, TenantError } from '../errors/errors.js';
import type { AccessToken, TokenProvider } from './token-provider.js';
import {
  browserLocation,
  globalCrypto,
  globalSessionStorage,
  memoryStorage,
  type ClockLike,
  type CryptoLike,
  type LocationLike,
  type StorageLike,
} from './env.js';
import { createCodeChallenge, createCodeVerifier, createState, readElementClaim } from './pkce.js';
import { OAuthHttp } from './oauth-http.js';

const TX_KEY = 'urbanos.pkce.tx';
const REFRESH_KEY = 'urbanos.pkce.refresh';
// The active mandate lives alongside the refresh token: it survives a reload
// exactly when the refresh token does, so the tenant scope a switcher picked is
// re-applied on the next load instead of silently dropping to instance level.
const MANDATE_KEY = 'urbanos.pkce.mandate';
/** Matches the gateway's 10-minute authorization-code TTL. */
const TX_MAX_AGE_MS = 10 * 60_000;
/**
 * Ceiling on concurrently pending authorizations. Only a caller that starts
 * flows without ever redirecting can reach it; the oldest is then evicted so a
 * runaway loop cannot grow sessionStorage without bound.
 */
const MAX_PENDING_TX = 10;

interface PendingTx {
  verifier: string;
  state: string;
  redirectUri: string;
  elementId?: number;
  createdAt: number;
}

/**
 * Every pending authorization, keyed by its `state`.
 *
 * Until 0.3.1 this slot held ONE transaction, so every beginAuthorization()
 * overwrote the previous one. Any second start orphaned the first — two tabs, a
 * double-clicked sign-in button, a retry after a failure — and when that older
 * callback came back it died on the CSRF gate with `pkce: state mismatch`,
 * blaming the integrator for something the SDK had discarded.
 *
 * Keyed storage lets concurrent flows coexist. The gate itself is unchanged: a
 * state is still only accepted if it is one WE minted, and it is still consumed
 * exactly once.
 *
 * One slot rather than one key per state because StorageLike is deliberately
 * getItem/setItem/removeItem only — it cannot enumerate, so per-state keys could
 * never be pruned or cleared on logout.
 */
type PendingTxMap = Record<string, PendingTx>;

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

  // The mandate this provider binds tokens to. The standalone (PKCE) flow is not
  // mandate-bound at login (the gateway issues mid=0), so mandate-scoped data is
  // invisible until an app selects one. Once set, every refresh carries the
  // `mandate_id` so the binding survives silent rotation; switching is another
  // setActiveMandate(). null = instance-level (no mandate).
  private activeMandateId: number | null = null;

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
    // Re-apply a mandate a previous page load bound (persisted only when the
    // refresh token is — i.e. same lifetime), so a reload keeps the tenant scope.
    const storedMandate = Number(this.refreshStore.getItem(MANDATE_KEY));
    if (Number.isFinite(storedMandate) && storedMandate > 0) {
      this.activeMandateId = storedMandate;
    }
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
   * Read the pending transactions.
   *
   * A pre-0.3.1 value is a bare PendingTx rather than a map. It is migrated in
   * place instead of discarded, so a redirect already in flight when the app
   * upgrades still completes rather than failing the state gate.
   */
  private readTxMap(): PendingTxMap {
    const raw = this.storage.getItem(TX_KEY);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw) as PendingTxMap | PendingTx | null;
      if (!parsed || typeof parsed !== 'object') return {};
      if (typeof (parsed as PendingTx).state === 'string') {
        const legacy = parsed as PendingTx;
        return { [legacy.state]: legacy };
      }
      return parsed as PendingTxMap;
    } catch {
      return {};
    }
  }

  /** Persist, removing the slot entirely once nothing is pending. */
  private writeTxMap(map: PendingTxMap): void {
    if (!Object.keys(map).length) {
      this.storage.removeItem(TX_KEY);
      return;
    }
    this.storage.setItem(TX_KEY, JSON.stringify(map));
  }

  /**
   * Drop expired transactions, then the oldest beyond the ceiling.
   *
   * Called on write rather than on a timer: a flow that is never completed would
   * otherwise sit in sessionStorage until the tab closes, and expiry is already
   * the rule completeAuthorization enforces.
   */
  private prune(map: PendingTxMap): PendingTxMap {
    const now = this.clock();
    return Object.fromEntries(
      Object.entries(map)
        .filter(([, tx]) => now - tx.createdAt <= TX_MAX_AGE_MS)
        .sort((a, b) => b[1].createdAt - a[1].createdAt)
        .slice(0, MAX_PENDING_TX),
    );
  }

  /**
   * Start the flow: mint verifier + state, persist them, navigate to the shell.
   * Never resolves — the page is going away.
   *
   * Starting a second flow no longer invalidates a first one still in flight.
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
    const pending = this.readTxMap();
    pending[state] = tx;
    // Prune AFTER inserting: this transaction is the newest, so it can never be
    // the one evicted.
    this.writeTxMap(this.prune(pending));

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

    // Load AND DELETE this state's transaction before any await. Doing it
    // synchronously makes a double mount (React StrictMode, a stray second call)
    // impossible to turn into two code exchanges: the second call finds nothing
    // under that state and fails the check below without touching the network.
    //
    // Only THIS state is consumed. Another tab's pending flow is left alone —
    // completing one authorization must not sabotage a concurrent one.
    const pending = this.readTxMap();
    const tx = state ? (pending[state] ?? null) : null;
    if (tx && state) {
      this.writeTxMap(Object.fromEntries(Object.entries(pending).filter(([s]) => s !== state)));
    }

    if (error) {
      this.scrubUrl(current);
      throw new AuthError(current.searchParams.get('error_description') ?? error);
    }

    // CSRF gate. A mismatch must emit NO network request at all. The state
    // equality is redundant after a keyed lookup and kept deliberately: it is
    // the one check standing between corrupted storage and a code exchange.
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
        // Bind (or re-bind) the active mandate. The gateway validates membership
        // before baking `mid`; a non-member id is denied, never silently dropped.
        ...(this.activeMandateId != null ? { mandate_id: this.activeMandateId } : {}),
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

  /** The mandate this provider currently binds to (undefined = instance-level). */
  activeMandate(): number | undefined {
    return this.activeMandateId ?? undefined;
  }

  /**
   * Select the active mandate (or `null` for instance-level) and re-mint a token
   * bound to it. The standalone flow needs this because PKCE login yields a
   * mid=0 token; mandate-scoped data stays invisible until a mandate is bound.
   * Switching mandate is another call. Requires a refresh token (i.e. a
   * completed login); the gateway denies a mandate the user is not a member of.
   *
   * Returns the freshly-bound token. A no-op (same mandate) still returns the
   * current token without a network call.
   */
  async setActiveMandate(mandateId: number | null): Promise<AccessToken> {
    const next = mandateId ?? null;
    if (next === this.activeMandateId && this.cached) return this.cached;
    this.activeMandateId = next;
    if (next == null) this.refreshStore.removeItem(MANDATE_KEY);
    else this.refreshStore.setItem(MANDATE_KEY, String(next));
    // Force a refresh so the new binding takes effect immediately, not on the
    // next skew-window expiry.
    return this.refresh();
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
    this.activeMandateId = null;
    this.refreshStore.removeItem(REFRESH_KEY);
    this.refreshStore.removeItem(MANDATE_KEY);
    try {
      this.storage.removeItem(TX_KEY);
    } catch {
      /* storage may be unavailable during teardown */
    }
  }
}
