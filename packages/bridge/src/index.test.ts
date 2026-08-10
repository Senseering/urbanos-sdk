import { describe, expect, test } from 'vitest';
import { linkedChannels } from './channel';
import { connectApp, createHost, type BridgeContext, type TokenResponse } from './index';

const ctx: BridgeContext = {
  mode: 'embedded',
  tenant: { id: 42, name: 'Demo-Stadt Köln' },
  locale: 'de',
  theme: { mode: 'light', primaryColor: '#0055ff' },
  demo: false,
  user: { id: 'u1', displayName: 'Demo User', appRole: 'member' },
  capabilities: [],
};

describe('embed bridge v2', () => {
  test('handshake delivers context, then token, then context change', async () => {
    const [appCh, hostCh] = linkedChannels();
    let tokenCalls = 0;
    const host = createHost(hostCh, {
      context: ctx,
      onTokenRequest: () => {
        tokenCalls++;
        return Promise.resolve<TokenResponse>({
          accessToken: 'scoped-jwt',
          expiresAt: Date.now() + 900_000,
          scopes: ['element:read'],
          tenantId: 42,
        });
      },
    });

    const app = await connectApp(appCh, { timeoutMs: 1000, helloIntervalMs: 20 });
    expect(app.context.tenant.name).toBe('Demo-Stadt Köln');

    const token = await app.getToken();
    expect(token.accessToken).toBe('scoped-jwt');
    expect(tokenCalls).toBe(1);

    let changed: BridgeContext | undefined;
    app.onContextChanged((c) => {
      changed = c;
    });
    host.emitContext({ ...ctx, demo: true });
    await new Promise((r) => setTimeout(r, 10));
    expect(changed?.demo).toBe(true);

    app.close();
    host.close();
  });

  test('delivers an optional mandate and lets it change through CONTEXT_CHANGED', async () => {
    const [appCh, hostCh] = linkedChannels();
    const withMandate: BridgeContext = {
      ...ctx,
      mandate: { id: 7, name: 'Stadtwerke', role: 'manager' },
    };
    const host = createHost(hostCh, {
      context: withMandate,
      onTokenRequest: () =>
        Promise.resolve<TokenResponse>({
          accessToken: 't',
          expiresAt: 1,
          scopes: [],
          tenantId: 42,
        }),
    });

    const app = await connectApp(appCh, { timeoutMs: 1000, helloIntervalMs: 20 });
    expect(app.context.mandate).toEqual({ id: 7, name: 'Stadtwerke', role: 'manager' });

    let changed: BridgeContext | undefined;
    app.onContextChanged((c) => {
      changed = c;
    });
    // Mandate switch in the shell → a different mandate.
    host.emitContext({ ...ctx, mandate: { id: 9, name: 'Verkehr', role: 'member' } });
    await new Promise((r) => setTimeout(r, 10));
    expect(changed?.mandate).toEqual({ id: 9, name: 'Verkehr', role: 'member' });

    app.close();
    host.close();
  });

  test('remains backward-compatible with a host that omits mandate', async () => {
    const [appCh, hostCh] = linkedChannels();
    // `ctx` has no `mandate` field — an old host.
    const host = createHost(hostCh, {
      context: ctx,
      onTokenRequest: () =>
        Promise.resolve<TokenResponse>({
          accessToken: 't',
          expiresAt: 1,
          scopes: [],
          tenantId: 42,
        }),
    });

    const app = await connectApp(appCh, { timeoutMs: 1000, helloIntervalMs: 20 });
    expect(app.context.mandate).toBeUndefined();
    expect(app.context.tenant.name).toBe('Demo-Stadt Köln');

    app.close();
    host.close();
  });

  test('rejects when no host answers', async () => {
    const [appCh] = linkedChannels(); // host side never wired
    await expect(connectApp(appCh, { timeoutMs: 60, helloIntervalMs: 15 })).rejects.toThrow(
      /host did not answer/,
    );
  });

  test('lifecycle + host-mediated UI messages flow both ways', async () => {
    const [appCh, hostCh] = linkedChannels();
    let ready = false;
    let hostRoute = '';
    let hostHeight = 0;
    let hostToast = '';
    const host = createHost(hostCh, {
      context: ctx,
      onTokenRequest: () =>
        Promise.resolve<TokenResponse>({
          accessToken: 't',
          expiresAt: 1,
          scopes: [],
          tenantId: 42,
        }),
    });
    host.onReady(() => {
      ready = true;
    });
    host.onRouteChanged((p) => {
      hostRoute = p;
    });
    host.onResize((h) => {
      hostHeight = h;
    });
    host.onToast((t) => {
      hostToast = t.title;
    });

    const app = await connectApp(appCh, { timeoutMs: 1000, helloIntervalMs: 20 });
    let appPath = '';
    app.onNavigate((p) => {
      appPath = p;
    });

    // guest → host
    app.signalReady();
    app.notifyRoute('/analytics');
    app.requestResize(640);
    app.toast({ title: 'saved' });
    // host → guest
    host.navigate('/detail/7');
    await new Promise((r) => setTimeout(r, 10));

    expect(ready).toBe(true);
    expect(hostRoute).toBe('/analytics');
    expect(hostHeight).toBe(640);
    expect(hostToast).toBe('saved');
    expect(appPath).toBe('/detail/7');

    app.close();
    host.close();
  });
});
