/** The runtime context an app runs in, identical whether embedded or standalone. */

export type Mode = 'embedded' | 'standalone';

export interface ThemeContext {
  mode: 'light' | 'dark';
  primaryColor: string;
}

export interface UserContext {
  id: string;
  displayName: string;
  appRole: 'admin' | 'member';
}

/** The active mandate — a sub-tenant grouping within the element/tenant. */
export interface MandateContext {
  id: number;
  name: string;
  role: 'admin' | 'manager' | 'member';
}

export interface UrbanOSContext {
  mode: Mode;
  tenant: { id: number; name: string };
  locale: string;
  theme: ThemeContext;
  demo: boolean;
  user: UserContext;
  capabilities: string[];
  /** Present only when a mandate is active; absent at instance level. */
  mandate?: MandateContext;
}

/** Feature/scope/capability predicate over the context. */
export function hasCapability(ctx: UrbanOSContext, cap: string): boolean {
  return ctx.capabilities.includes(cap);
}
