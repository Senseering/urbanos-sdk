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

export interface UrbanOSContext {
  mode: Mode;
  tenant: { id: number; name: string };
  locale: string;
  theme: ThemeContext;
  demo: boolean;
  user: UserContext;
  capabilities: string[];
}

/** Feature/scope/capability predicate over the context. */
export function hasCapability(ctx: UrbanOSContext, cap: string): boolean {
  return ctx.capabilities.includes(cap);
}
