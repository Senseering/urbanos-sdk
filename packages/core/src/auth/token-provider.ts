/** How the client obtains and refreshes a scoped app access token. */

export interface AccessToken {
  accessToken: string;
  expiresAt: number; // epoch ms
  scopes: string[];
  tenantId: number;
  /**
   * The active mandate (a sub-tenant grouping within the element/tenant), when
   * one is scoped into the token. Undefined at instance level (no mandate).
   */
  mandateId?: number;
}

export interface TokenProvider {
  /** Return a currently-valid token, refreshing if needed. */
  getToken(): Promise<AccessToken>;
  /** Force a refresh. */
  refresh(): Promise<AccessToken>;
}

/** A fixed token, for tests and injected scenarios. */
export class StaticTokenProvider implements TokenProvider {
  constructor(private readonly token: AccessToken) {}
  getToken(): Promise<AccessToken> {
    return Promise.resolve(this.token);
  }
  refresh(): Promise<AccessToken> {
    return Promise.resolve(this.token);
  }
}
