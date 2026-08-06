# @senseering/urbanos-bridge

Embed protocol v2 — the duplex channel between the urbanOS shell (host) and an app
running in an iframe (guest). Carries context and a scoped app token; the user's
platform session never crosses it.

Zero dependencies. ESM only.

## Install

```bash
pnpm add @senseering/urbanos-bridge
```

## Use

App side:

```ts
import { connectApp, windowChannel } from '@senseering/urbanos-bridge';

const bridge = await connectApp(
  windowChannel({ target: window.parent, targetOrigin: 'https://urbanos.udp.city' }),
);

const { tenant, theme, locale, demo } = bridge.context;

bridge.onContextChanged((ctx) => applyTheme(ctx.theme));
bridge.onNavigate((path) => router.push(path));
bridge.signalReady();
```

Host side:

```ts
import { createHost, windowChannel } from '@senseering/urbanos-bridge';

const host = createHost(windowChannel({ target: iframe.contentWindow, targetOrigin: appOrigin }), {
  context,
  onTokenRequest: () => mintScopedToken(),
});
```

Pair it with `HostTokenProvider` from `@senseering/urbanos-core` to get an
authenticated client.

## Docs

- [Embedding](../../docs/embedding.md) — handshake, messages, lifecycle
- [API reference](../../docs/api-reference.md#senseeringurbanos-bridge)
