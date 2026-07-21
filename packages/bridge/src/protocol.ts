/** Embed protocol v2 message types. The host delivers a scoped app token and
 * context; the user session never crosses the bridge. See docs/v2-migration/04-sdk.md §2. */

export const PROTOCOL_VERSION = 2;

export interface Envelope {
  urbanos: 2;
  id: string;
  kind: 'req' | 'res' | 'event';
  type: string;
  payload?: unknown;
  error?: { code: string; message: string };
}

export interface BridgeContext {
  mode: 'embedded';
  tenant: { id: number; name: string };
  locale: string;
  theme: { mode: 'light' | 'dark'; primaryColor: string };
  demo: boolean;
  user: { id: string; displayName: string; appRole: 'admin' | 'member' };
  capabilities: string[];
}

export interface TokenResponse {
  accessToken: string;
  expiresAt: number;
  scopes: string[];
  tenantId: number;
}

// Message type constants.
export const HELLO = 'urbanos:hello';
export const WELCOME = 'urbanos:welcome';
export const TOKEN_GET = 'token.get';
export const TOKEN_REVOKED = 'token.revoked';
export const CONTEXT_CHANGED = 'context.changed';
