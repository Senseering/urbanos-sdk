# Getting started

From zero to a working urbanOS app. The first half needs **no credentials at all** —
demo mode runs offline, so you can build your entire app before you have platform
access.

- [Requirements](#requirements)
- [Installing the packages](#installing-the-packages)
- [Your first app (offline)](#your-first-app-offline)
- [Going live](#going-live)
- [Using Vue](#using-vue)
- [Where to go next](#where-to-go-next)

## Requirements

- **Node ≥ 22**
- **ESM only.** These packages ship no CommonJS build — `require()` will not work.
- TypeScript is optional but recommended; every package ships its own types.

## Installing the packages

The packages are on **public npm** under the `@datamatters-gmbh` scope. No registry
config, no token, no account:

```bash
pnpm add @datamatters-gmbh/urbanos-core @datamatters-gmbh/urbanos-demo
```

```bash
npm  install @datamatters-gmbh/urbanos-core @datamatters-gmbh/urbanos-demo
yarn add     @datamatters-gmbh/urbanos-core @datamatters-gmbh/urbanos-demo
```

Add the others as you need them — `urbanos-bridge` to embed in the shell,
`urbanos-manifest` to publish, `urbanos-vue` for Vue bindings.

> **Moving from GitHub Packages?** Releases up to core 0.1.0 were published to
> GitHub Packages under the `@senseering` scope. Everything from core 0.2.0 is on
> npm under `@datamatters-gmbh`. Drop the `@senseering:registry` line and the
> `read:packages` token from your `.npmrc` — neither is needed any more — and
> rename your imports. Nothing else about the API changed in the move.

## Your first app (offline)

Demo mode needs no token, no network, and no client registration. You define a
dataset, hand it to `DemoTransport`, and the client behaves exactly as it will
against real data.

```ts
import { DemoTransport, UrbanOSClient, type DemoDataset } from '@datamatters-gmbh/urbanos-core';
import { dailyRhythm, defineDemoDataset, seededRng } from '@datamatters-gmbh/urbanos-demo';

// 1. Describe the world your app sees.
const rng = seededRng(1337);

const dataset: DemoDataset = defineDemoDataset({
  seed: 1337,
  tenant: { id: 42, name: 'Demo-Stadt Köln' },
  entities: [
    {
      id: 1,
      name: 'Parkplatz P1',
      category: 'parking',
      lat: 50.9413,
      long: 6.9583,
      streams: [{ id: 11, name: 'occupied', unit: 'bool' }],
    },
    {
      id: 2,
      name: 'Schallpegel Dom',
      category: 'noise',
      lat: 50.9413,
      long: 6.958,
      streams: [{ id: 21, name: 'LAeq', unit: 'dB' }],
    },
  ],
  // One generator per stream id: (at: Date) => number | null
  generators: {
    11: dailyRhythm({ base: 0.5, amplitude: 0.4, peakHour: 13, noise: 0.1, rng }),
    21: dailyRhythm({ base: 55, amplitude: 8, peakHour: 18 }),
  },
});

// 2. Build a client on top of it.
const client = new UrbanOSClient(new DemoTransport(dataset));

// 3. Use it.
const element = await client.element();
console.log(element.name); // "Demo-Stadt Köln"

const parking = await client.datasources({ category: 'parking' });
console.log(parking.length); // 1

const noise = await client
  .timeseries(21)
  .range({ last: '24h' })
  .aggregate('avg', { bucket: '1h', gapFill: 'last-value' })
  .execute();

console.log(noise.points); // [{ t: '2026-…Z', v: 57.2 }, …]
```

That is a complete, running app's worth of data access. A working version lives in
[`examples/minimal-vanilla`](../examples/minimal-vanilla) — copy it as a starting
point:

```bash
pnpm --filter @urbanos-examples/minimal-vanilla build
pnpm --filter @urbanos-examples/minimal-vanilla start
```

> **Gotcha:** `DemoTransport` samples at **one hour** by default. If you aggregate
> into buckets finer than that, most buckets come back empty. Pass
> `new DemoTransport(dataset, { resolutionMs: 60_000 })` for minute-resolution data.

See [Demo mode](demo-mode.md) for building realistic datasets.

## Going live

Swap the transport. Nothing else in your app changes.

```ts
import { HttpTransport, UrbanOSClient, PkceTokenProvider } from '@datamatters-gmbh/urbanos-core';

const auth = new PkceTokenProvider({
  gatewayUrl: 'https://urbanos-gateway.udp.city',
  shellUrl: 'https://urbanos.udp.city',
  clientId: 'uos_c_yourclientid',
  redirectUri: 'https://yourapp.example.com/callback',
  scopes: ['profile:read', 'element:read', 'datasources:read', 'data:read:noise'],
});

const client = new UrbanOSClient(
  new HttpTransport({ baseUrl: 'https://urbanos-gateway.udp.city', tokens: auth }),
);
```

In practice you pick one at startup:

```ts
const isDemo = new URLSearchParams(location.search).get('demo') === 'true';

const client = new UrbanOSClient(
  isDemo ? new DemoTransport(dataset) : new HttpTransport({ baseUrl, tokens: auth }),
);
```

Going live requires a registered client, granted scopes, and an install in the target
organisation. **[Authentication](authentication.md) walks through all of it** —
read it before you write auth code, because a few of the requirements (exact
redirect-URI matching, CORS origin allowlisting) fail in confusing ways if missed.

## Using Vue

`@datamatters-gmbh/urbanos-vue` provides a plugin and composables. Note it takes an
**already-constructed** client — it does not build one for you.

```ts
// main.ts
import { createApp } from 'vue';
import { createUrbanOS } from '@datamatters-gmbh/urbanos-vue';
import { DemoTransport, UrbanOSClient } from '@datamatters-gmbh/urbanos-core';
import App from './App.vue';

const client = new UrbanOSClient(new DemoTransport(dataset));

createApp(App)
  .use(
    createUrbanOS({
      client,
      context: {
        mode: 'standalone',
        tenant: { id: 42, name: 'Demo-Stadt Köln' },
        locale: 'de',
        theme: { mode: 'light', primaryColor: 'violet' },
        demo: true,
        user: { id: 'u1', displayName: 'Demo', appRole: 'member' },
        capabilities: [],
      },
    }),
  )
  .mount('#app');
```

`useAppState` wraps the loading/ready/empty/error states every screen needs. It runs
the loader **immediately** — it is not lazy.

```vue
<script setup lang="ts">
import { useAppState, useUrbanOS } from '@datamatters-gmbh/urbanos-vue';

const { client } = useUrbanOS();

const { state, data, error, reload } = useAppState(
  () => client.datasources({ category: 'parking' }),
  { isEmpty: (d) => d.length === 0 },
);
</script>

<template>
  <p v-if="state === 'loading'">Loading…</p>
  <p v-else-if="state === 'empty'">No sensors found</p>
  <p v-else-if="state === 'error'">
    {{ (error as Error).message }} <button @click="reload">Retry</button>
  </p>
  <ul v-else>
    <li v-for="d in data" :key="d.id">{{ d.name }}</li>
  </ul>
</template>
```

> There is **no Nuxt module yet** despite the package existing. On Nuxt, call
> `createUrbanOS` from a normal client-side plugin.

## Where to go next

- **[Querying data](querying-data.md)** — the full client API
- **[Authentication](authentication.md)** — getting real data flowing
- **[Demo mode](demo-mode.md)** — building the dataset you ship
- **[Embedding](embedding.md)** — running inside the urbanOS shell
- **[Publishing](publishing.md)** — the manifest and the store
