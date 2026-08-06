/** The SDK error taxonomy. Callers can branch on these to handle failures. */

export class UrbanOSError extends Error {
  /**
   * A stable, dup-proof discriminator.
   *
   * `instanceof` silently fails across two copies of a package, and consumers
   * pin exact versions, so a transitive duplicate would break every check.
   * Branch on `code` when that matters; `instanceof` remains fine within one
   * copy.
   */
  readonly code: string;

  constructor(message: string, code = 'urbanos_error') {
    super(message);
    this.name = 'UrbanOSError';
    this.code = code;
  }
}

/** Authentication failed (missing/invalid/expired token). */
export class AuthError extends UrbanOSError {
  constructor(message = 'authentication failed') {
    super(message, 'auth');
    this.name = 'AuthError';
  }
}

/** The token lacks a required scope. */
export class ScopeError extends UrbanOSError {
  constructor(message = 'insufficient scope') {
    super(message, 'scope');
    this.name = 'ScopeError';
  }
}

/** The requested resource is outside the token's element. */
export class TenantError extends UrbanOSError {
  constructor(message = 'tenant mismatch') {
    super(message, 'tenant');
    this.name = 'TenantError';
  }
}

/**
 * The user has not consented to the requested scopes.
 *
 * The gateway maps this to HTTP 428 (api/oauth.go oauthErr). Only the embedded
 * token-exchange path returns it today — the standalone authorize path records
 * consent server-side — but the shell shares this client, so it is modelled.
 */
export class ConsentError extends UrbanOSError {
  constructor(message = 'consent required') {
    super(message, 'consent_required');
    this.name = 'ConsentError';
  }
}

/** The gateway returned an unexpected HTTP error. */
export class GatewayError extends UrbanOSError {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message, 'gateway');
    this.name = 'GatewayError';
  }
}

/** The embed bridge failed (handshake, timeout, protocol). */
export class BridgeError extends UrbanOSError {
  constructor(message = 'bridge error') {
    super(message, 'bridge');
    this.name = 'BridgeError';
  }
}
