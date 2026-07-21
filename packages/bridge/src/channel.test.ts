import { describe, expect, test } from 'vitest';
import { windowChannel, type MessageEventLike, type WindowLike } from './channel';
import { connectApp, createHost, type BridgeContext, type TokenResponse } from './index';

interface MockWindow extends WindowLike {
  deliver(data: unknown, origin: string, source: unknown): void;
}

function mockWindow(): MockWindow {
  const listeners = new Set<(event: MessageEventLike) => void>();
  return {
    postMessage() {
      /* wired by the harness below */
    },
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
    deliver: (data, origin, source) => listeners.forEach((l) => l({ data, origin, source })),
  };
}

const HOST_ORIGIN = 'https://shell.urbanos.city';
const GUEST_ORIGIN = 'https://app.urbanos.city';

/** Two mock windows wired like a real host↔iframe pair. */
function harness(): { hostWin: MockWindow; guestWin: MockWindow } {
  const hostWin = mockWindow();
  const guestWin = mockWindow();
  // Posting TO the guest window arrives there tagged with the host's origin.
  guestWin.postMessage = (data) => guestWin.deliver(data, HOST_ORIGIN, hostWin);
  hostWin.postMessage = (data) => hostWin.deliver(data, GUEST_ORIGIN, guestWin);
  return { hostWin, guestWin };
}

const ctx: BridgeContext = {
  mode: 'embedded',
  tenant: { id: 42, name: 'Demo-Stadt Köln' },
  locale: 'de',
  theme: { mode: 'light', primaryColor: '#0055ff' },
  demo: true,
  user: { id: 'u1', displayName: 'Demo User', appRole: 'member' },
  capabilities: [],
};

describe('windowChannel', () => {
  test('full handshake + token over the postMessage adapter', async () => {
    const { hostWin, guestWin } = harness();

    const host = createHost(
      windowChannel({ target: guestWin, targetOrigin: GUEST_ORIGIN, self: hostWin }),
      {
        context: ctx,
        onTokenRequest: () =>
          Promise.resolve<TokenResponse>({
            accessToken: 'scoped-jwt',
            expiresAt: 2_000_000_000_000,
            scopes: ['element:read'],
            tenantId: 42,
          }),
      },
    );

    const app = await connectApp(
      windowChannel({ target: hostWin, targetOrigin: HOST_ORIGIN, self: guestWin }),
      { timeoutMs: 1000, helloIntervalMs: 20 },
    );
    expect(app.context.tenant.name).toBe('Demo-Stadt Köln');
    expect(app.context.demo).toBe(true);

    const token = await app.getToken();
    expect(token.accessToken).toBe('scoped-jwt');

    app.close();
    host.close();
  });

  test('rejects messages from a foreign origin', () => {
    const win = mockWindow();
    const target = mockWindow();
    const received: unknown[] = [];
    const channel = windowChannel({ target, targetOrigin: GUEST_ORIGIN, self: win });
    channel.onMessage((m) => received.push(m));

    win.deliver({ hello: 1 }, 'https://evil.example', target); // wrong origin
    win.deliver({ hello: 2 }, GUEST_ORIGIN, target); // correct origin + source
    expect(received).toEqual([{ hello: 2 }]);
  });

  test('rejects messages from a foreign source window', () => {
    const win = mockWindow();
    const target = mockWindow();
    const other = mockWindow();
    const received: unknown[] = [];
    windowChannel({ target, targetOrigin: GUEST_ORIGIN, self: win }).onMessage((m) =>
      received.push(m),
    );

    win.deliver({ x: 1 }, GUEST_ORIGIN, other); // right origin, wrong source
    expect(received).toEqual([]);
  });
});
