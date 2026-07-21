/** The SDK error taxonomy. Callers can branch on these to handle failures. */

export class UrbanOSError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UrbanOSError';
  }
}

/** Authentication failed (missing/invalid/expired token). */
export class AuthError extends UrbanOSError {
  constructor(message = 'authentication failed') {
    super(message);
    this.name = 'AuthError';
  }
}

/** The token lacks a required scope. */
export class ScopeError extends UrbanOSError {
  constructor(message = 'insufficient scope') {
    super(message);
    this.name = 'ScopeError';
  }
}

/** The requested resource is outside the token's element. */
export class TenantError extends UrbanOSError {
  constructor(message = 'tenant mismatch') {
    super(message);
    this.name = 'TenantError';
  }
}

/** The gateway returned an unexpected HTTP error. */
export class GatewayError extends UrbanOSError {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'GatewayError';
  }
}

/** The embed bridge failed (handshake, timeout, protocol). */
export class BridgeError extends UrbanOSError {
  constructor(message = 'bridge error') {
    super(message);
    this.name = 'BridgeError';
  }
}
