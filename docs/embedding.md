# Embedding

When your app runs inside the urbanOS shell, it lives in an iframe and talks to the
host over the **embed bridge** — protocol v2, zero dependencies.

The bridge carries context and a scoped token. **It is not a data proxy.** Your data
still goes over HTTPS to the gateway; the bridge just tells you who you are and hands
you a token. The user's platform session never crosses it.

- [Connecting](#connecting)
- [The context](#the-context)
- [Getting a token](#getting-a-token)
- [Talking to the host](#talking-to-the-host)
- [Listening to the host](#listening-to-the-host)
- [Supporting both modes](#supporting-both-modes)
- [Hosting an app](#hosting-an-app)
- [Protocol reference](#protocol-reference)

## Connecting

```ts
import { connectApp, windowChannel } from '@senseering/urbanos-bridge';

const bridge = await connectApp(
  windowChannel({
    target: window.parent,
    targetOrigin: 'https://urbanos.udp.city',
  }),
);

bridge.signalReady();
```

`connectApp` sends a `hello` immediately and **repeats it every 250 ms** until the
host answers — so it doesn't matter whether your app or the host finishes loading
first. It rejects with `bridge: host did not answer` after 2 seconds.

```ts
connectApp(channel, { timeoutMs: 5000, helloIntervalMs: 100 });
```

Call `bridge.signalReady()` once your UI is actually usable — that's what the host
waits on to hide its loading state.

### Origin security

`windowChannel` **posts to an explicit origin, never `'*'`**, and drops any inbound
message whose origin doesn't match. Set `targetOrigin` to the shell's origin.

Don't derive the host origin from `document.referrer` — a `no-referrer` policy on the
host silently degrades that to a wildcard.

## The context

Available synchronously once connected, via `bridge.context`:

```ts
interface BridgeContext {
  mode: 'embedded';
  tenant: { id: number; name: string };
  locale: string; // e.g. 'de'
  theme: { mode: 'light' | 'dark'; primaryColor: string };
  demo: boolean;
  user: { id: string; displayName: string; appRole: 'admin' | 'member' };
  capabilities: string[];
}
```

```ts
const { tenant, locale, theme, demo, user } = bridge.context;

document.documentElement.dataset.theme = theme.mode;
i18n.locale = locale;
```

Match the host's theme and locale — an embedded app that ignores them looks broken
next to the shell.

### Capabilities

`capabilities` lists what the host will honour. **Today the shell grants exactly
one: `'toast'`.** Check before using an optional feature:

```ts
import { hasCapability } from '@senseering/urbanos-core';

if (hasCapability(bridge.context, 'toast')) {
  bridge.toast({ title: 'Saved' });
}
```

## Getting a token

Pass the bridge straight to `HostTokenProvider`:

```ts
import { HostTokenProvider, HttpTransport, UrbanOSClient } from '@senseering/urbanos-core';

const client = new UrbanOSClient(
  new HttpTransport({
    baseUrl: 'https://urbanos-gateway.udp.city',
    tokens: new HostTokenProvider(bridge),
  }),
);
```

That's the whole auth story when embedded — no consent screen, no redirects. See
[Authentication](authentication.md#embedded-apps).

> **In demo mode the host refuses to mint a token.** Check `bridge.context.demo` and
> use `DemoTransport` instead. Requesting one anyway just fails.

> `getToken()` has **no timeout**. If a host never answers a token request the promise
> stays pending forever. Wrap it in your own timeout if you need to fail loudly.

## Talking to the host

| Call                       | Effect                                           |
| -------------------------- | ------------------------------------------------ |
| `bridge.signalReady()`     | Tell the host your UI is ready                   |
| `bridge.notifyRoute(path)` | Report in-app navigation so the host can sync    |
| `bridge.requestResize(h)`  | Ask for a different iframe height                |
| `bridge.toast(toast)`      | Show a toast in the shell's UI (needs `'toast'`) |
| `bridge.close()`           | Unsubscribe from the channel                     |

```ts
router.afterEach((to) => bridge.notifyRoute(to.fullPath));

bridge.toast({ title: 'Report exported', description: 'Check downloads.' });
```

These are fire-and-forget events. The host may ignore any of them.

## Listening to the host

Every listener returns an unsubscribe function.

```ts
const stop = bridge.onContextChanged((ctx) => {
  document.documentElement.dataset.theme = ctx.theme.mode;
});

bridge.onNavigate((path) => router.push(path));

bridge.onTokenRevoked((reason) => showSignedOutState(reason));
```

- **`onContextChanged`** — fires when the user switches organisation, theme, locale,
  or demo mode. Re-render rather than assuming the boot context is permanent. An
  organisation switch means your cached data is for the wrong tenant.
- **`onNavigate`** — the host deep-linking into one of your `screens`.
- **`onTokenRevoked`** — after this, `getToken()` throws `AuthError` until a fresh
  token arrives.

## Supporting both modes

One codebase can run embedded and standalone. Try the bridge; fall back if there's no
host.

```ts
import { connectApp, windowChannel } from '@senseering/urbanos-bridge';
import {
  DemoTransport,
  HostTokenProvider,
  HttpTransport,
  PkceTokenProvider,
  UrbanOSClient,
} from '@senseering/urbanos-core';

async function createClient() {
  const embedded = window.parent !== window;

  if (embedded) {
    const bridge = await connectApp(
      windowChannel({ target: window.parent, targetOrigin: HOST_ORIGIN }),
    );

    if (bridge.context.demo) {
      bridge.signalReady();
      return { client: new UrbanOSClient(new DemoTransport(dataset)), bridge };
    }

    const client = new UrbanOSClient(
      new HttpTransport({ baseUrl: GATEWAY, tokens: new HostTokenProvider(bridge) }),
    );
    bridge.signalReady();
    return { client, bridge };
  }

  // Standalone
  const auth = new PkceTokenProvider({/* … */});
  await auth.completeAuthorization();
  return {
    client: new UrbanOSClient(new HttpTransport({ baseUrl: GATEWAY, tokens: auth })),
    bridge: null,
  };
}
```

## Hosting an app

If you're building the host side:

```ts
import { createHost, windowChannel } from '@senseering/urbanos-bridge';

const host = createHost(windowChannel({ target: iframe.contentWindow, targetOrigin: appOrigin }), {
  context: buildContext(),
  onTokenRequest: () => mintScopedToken(),
});

host.onReady(() => hideSpinner());
host.onToast((t) => showToast(t));
host.onResize((h) => (iframe.style.height = `${h}px`));
host.onRouteChanged((path) => syncUrl(path));

// Later
host.emitContext(nextContext);
host.revokeToken('session ended');
host.close();
```

Create the host **before or as** the iframe loads — the guest retries `hello`, so a
late host still connects, but an early one is cleaner. Mint tokens scoped to the app
and the element; never pass the user's session through.

## Protocol reference

| Message           | Kind    | Direction  |
| ----------------- | ------- | ---------- |
| `urbanos:hello`   | event   | app → host |
| `urbanos:welcome` | event   | host → app |
| `token.get`       | req/res | app ⇄ host |
| `token.revoked`   | event   | host → app |
| `context.changed` | event   | host → app |
| `ready`           | event   | app → host |
| `navigate`        | event   | host → app |
| `route.changed`   | event   | app → host |
| `resize`          | event   | app → host |
| `ui.toast`        | event   | app → host |

**`token.get` is the only request/response pair.** Everything else is one-way.

Handshake: app sends `hello` (repeating) → host replies `welcome` with the context →
app resolves. Later `welcome` messages are ignored.

Envelope:

```ts
interface Envelope {
  urbanos: 2;
  id: string;
  kind: 'req' | 'res' | 'event';
  type: string;
  payload?: unknown;
  error?: { code: string; message: string };
}
```

For testing without iframes, `linkedChannels()` returns a connected in-memory pair:

```ts
import { connectApp, createHost, linkedChannels } from '@senseering/urbanos-bridge';

const [hostChannel, appChannel] = linkedChannels();
const host = createHost(hostChannel, { context, onTokenRequest });
const bridge = await connectApp(appChannel);
```
