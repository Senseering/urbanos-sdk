/** Embed protocol v2 message types. The host delivers a scoped app token and
 * context; the user session never crosses the bridge. See docs/embedding.md. */

export const PROTOCOL_VERSION = 2;

export interface Envelope {
  urbanos: 2;
  id: string;
  kind: 'req' | 'res' | 'event';
  type: string;
  payload?: unknown;
  error?: { code: string; message: string };
}

/**
 * The active mandate (a sub-tenant grouping WITHIN the element/tenant). Optional
 * and additive: hosts that predate mandates omit it entirely, and it may change
 * through CONTEXT_CHANGED when the user switches mandate in the shell.
 */
export interface MandateContext {
  id: number;
  name: string;
  role: 'admin' | 'manager' | 'member';
}

export interface BridgeContext {
  mode: 'embedded';
  tenant: { id: number; name: string };
  locale: string;
  theme: { mode: 'light' | 'dark'; primaryColor: string };
  demo: boolean;
  user: { id: string; displayName: string; appRole: 'admin' | 'member' };
  capabilities: string[];
  /** Present only when a mandate is active; absent at instance level. */
  mandate?: MandateContext;
}

export interface TokenResponse {
  accessToken: string;
  expiresAt: number;
  scopes: string[];
  tenantId: number;
}

/** A guest-requested toast, surfaced by the host's UI. */
export interface ToastRequest {
  title: string;
  description?: string;
  color?: string;
}

// Message type constants.
export const HELLO = 'urbanos:hello';
export const WELCOME = 'urbanos:welcome';
export const TOKEN_GET = 'token.get';
export const TOKEN_REVOKED = 'token.revoked';
export const CONTEXT_CHANGED = 'context.changed';
// Guest lifecycle + host-mediated UI (all events, fire-and-forget).
export const READY = 'ready'; // guest → host: app mounted and connected
export const NAVIGATE = 'navigate'; // host → guest: deep-link the app
export const ROUTE_CHANGED = 'route.changed'; // guest → host: mirror app route into the shell URL
export const RESIZE = 'resize'; // guest → host: request a content height (capability-gated)
export const UI_TOAST = 'ui.toast'; // guest → host: show a toast in the shell chrome
