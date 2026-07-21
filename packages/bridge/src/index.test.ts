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

  test('rejects when no host answers', async () => {
    const [appCh] = linkedChannels(); // host side never wired
    await expect(connectApp(appCh, { timeoutMs: 60, helloIntervalMs: 15 })).rejects.toThrow(
      /host did not answer/,
    );
  });
});
