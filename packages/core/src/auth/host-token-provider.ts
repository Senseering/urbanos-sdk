/**
 * HostTokenProvider — adapts the embedded bridge to the TokenProvider contract,
 * so embedded and standalone apps satisfy ONE interface and `HttpTransport`
 * neither knows nor cares which mode it is in.
 *
 * Core must not import `@senseering/urbanos-bridge` (CONTRIBUTING.md: core and
 * bridge both carry zero dependencies). The source is therefore declared
 * STRUCTURALLY — the same technique channel.ts uses for the DOM. `AppBridge`
 * satisfies HostTokenSource without an import because bridge's `TokenResponse`
 * and core's `AccessToken` are field-identical by construction.
 *
 *   const bridge = await connectApp(channel);
 *   const tokens = new HostTokenProvider(bridge);
 *   const client = new UrbanOSClient(new HttpTransport({ baseUrl, tokens }));
 */
import { AuthError } from '../errors/errors';
import type { AccessToken, TokenProvider } from './token-provider';
import type { ClockLike } from './env';

/** Structurally satisfied by `AppBridge` from @senseering/urbanos-bridge. */
export interface HostTokenSource {
  getToken(): Promise<AccessToken>;
  onTokenRevoked?(cb: (reason: string) => void): () => void;
}

export interface HostTokenProviderOptions {
  /** Re-ask the host this many ms before expiry. Default 60_000. */
  expirySkewMs?: number;
  clock?: ClockLike;
}

export class HostTokenProvider implements TokenProvider {
  private readonly clock: ClockLike;
  private readonly skewMs: number;
  private cached: AccessToken | null = null;
  private inflight: Promise<AccessToken> | null = null;
  private revokedReason: string | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(
    private readonly source: HostTokenSource,
    opts: HostTokenProviderOptions = {},
  ) {
    this.clock = opts.clock ?? Date.now;
    this.skewMs = opts.expirySkewMs ?? 60_000;
    this.unsubscribe =
      source.onTokenRevoked?.((reason) => {
        // Drop the cache immediately. A revoked token must not keep being served
        // until it happens to expire.
        this.cached = null;
        this.revokedReason = reason || 'token revoked';
      }) ?? null;
  }

  async getToken(): Promise<AccessToken> {
    if (this.revokedReason) throw new AuthError(this.revokedReason);
    if (this.cached && this.clock() < this.cached.expiresAt - this.skewMs) {
      return this.cached;
    }
    return this.refresh();
  }

  /** Re-ask the host. Coalesced, for the same reason as PkceTokenProvider. */
  refresh(): Promise<AccessToken> {
    if (this.inflight) return this.inflight;
    this.inflight = this.source
      .getToken()
      .then((token) => {
        this.cached = token;
        this.revokedReason = null;
        return token;
      })
      .finally(() => {
        this.inflight = null;
      });
    return this.inflight;
  }

  /** Unsubscribe from the host's revocation events. */
  close(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }
}
