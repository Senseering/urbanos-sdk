/** Thin client for the gateway's POST /oauth/token endpoint. */
import { AuthError, ConsentError, GatewayError } from '../errors/errors';
import type { AccessToken } from './token-provider';
import type { ClockLike } from './env';
import { readElementClaim, readMandateClaim } from './pkce';

/** The gateway's token response (api/oauth.go tokenOut). */
export interface TokenResponseBody {
  access_token: string;
  token_type: string;
  /** SECONDS, not a timestamp. */
  expires_in: number;
  /** SPACE-DELIMITED string, not an array. */
  scope: string;
  refresh_token?: string;
  /** Added by the gateway so standalone apps have a tenant source. */
  element_id?: number;
  /** The active mandate baked into the token, when scoped. 0/absent = none. */
  mandate_id?: number;
}

export interface OAuthHttpOptions {
  gatewayUrl: string;
  fetchImpl?: typeof fetch;
  clock?: ClockLike;
}

export class OAuthHttp {
  private readonly fetchImpl: typeof fetch;
  private readonly clock: ClockLike;

  constructor(private readonly opts: OAuthHttpOptions) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.clock = opts.clock ?? Date.now;
  }

  // `mandate_id` must reach the gateway as a JSON number (it unmarshals int64), so
  // the body admits numbers, not only strings.
  async token(
    body: Record<string, string | number>,
  ): Promise<{ token: AccessToken; refresh?: string }> {
    const res = await this.fetchImpl(`${this.opts.gatewayUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw await this.mapError(res);

    const json = (await res.json()) as TokenResponseBody;
    return { token: this.toAccessToken(json), refresh: json.refresh_token };
  }

  private toAccessToken(json: TokenResponseBody): AccessToken {
    return {
      accessToken: json.access_token,
      // Derive from the RELATIVE expires_in, never the JWT `exp`. That is the
      // entire reason expires_in exists: it is immune to client clock skew. A
      // device 10 minutes fast reading `exp` would refresh on every call; one 10
      // minutes slow would never refresh until it 401s.
      expiresAt: this.clock() + json.expires_in * 1000,
      scopes: json.scope ? json.scope.split(/\s+/).filter(Boolean) : [],
      // Prefer the explicit field; fall back to decoding the token's `el` claim
      // for gateways that predate it.
      tenantId: json.element_id ?? readElementClaim(json.access_token),
      // Same pattern for the mandate: explicit field first, else decode `mid`.
      // Absent in both → undefined (instance-level / no mandate).
      mandateId: json.mandate_id ?? readMandateClaim(json.access_token),
    };
  }

  private async mapError(res: Response): Promise<Error> {
    let code = '';
    let description = '';
    try {
      const body = (await res.json()) as {
        error?: string;
        error_description?: string;
        detail?: string;
      };
      code = body.error ?? '';
      description = body.error_description ?? body.detail ?? '';
    } catch {
      /* non-JSON error body */
    }
    const msg = description || code || `gateway responded ${res.status}`;

    // The gateway's mapping (api/oauth.go oauthErr):
    //   invalid_client → 401 · access_denied → 403 · consent_required → 428
    //   invalid_grant → 400  · invalid_request → 400
    if (res.status === 428) return new ConsentError(msg);
    if (res.status === 401 || res.status === 403) return new AuthError(msg);
    if (res.status === 400) {
      // invalid_grant on a refresh means the rotation family was revoked (reuse
      // detected) or the token expired — either way the session is gone, so this
      // is an auth failure rather than a transport error.
      return new AuthError(msg);
    }
    return new GatewayError(msg, res.status);
  }
}
