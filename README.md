# urbanOS SDK

The developer SDK for building apps on the [urbanOS](https://urbanos.datamatters.io)
smart-city platform — the same SDK first-party apps use. Talk to the platform gateway
with typed clients, embed your app in the urbanOS shell, and run it fully offline in
demo mode.

**[→ Read the documentation](docs/README.md)**

## Install

Packages are published to GitHub Packages under the `@senseering` scope. GitHub
Packages requires a token to install, even for public packages — create a
[PAT](https://github.com/settings/tokens) with `read:packages`, then:

```ini
# .npmrc
@senseering:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```bash
export NODE_AUTH_TOKEN=ghp_yourtokenhere
pnpm add @senseering/urbanos-core @senseering/urbanos-demo
```

Full setup: [docs/getting-started.md](docs/getting-started.md).

## Thirty seconds

No credentials needed — demo mode runs offline:

```ts
import { DemoTransport, UrbanOSClient } from '@senseering/urbanos-core';
import { dailyRhythm, defineDemoDataset } from '@senseering/urbanos-demo';

const client = new UrbanOSClient(
  new DemoTransport(
    defineDemoDataset({
      seed: 1337,
      tenant: { id: 42, name: 'Demo-Stadt Köln' },
      entities: [
        {
          id: 2,
          name: 'Schallpegel Dom',
          category: 'noise',
          lat: 50.9413,
          long: 6.958,
          streams: [{ id: 21, name: 'LAeq', unit: 'dB' }],
        },
      ],
      generators: { 21: dailyRhythm({ base: 55, amplitude: 8, peakHour: 18 }) },
    }),
  ),
);

const noise = await client
  .timeseries(21)
  .range({ last: '24h' })
  .aggregate('avg', { bucket: '1h', gapFill: 'last-value' })
  .execute();
```

Going live is a one-line swap to `HttpTransport` — your app code doesn't change.

## Documentation

| Guide                                      | Covers                                     |
| ------------------------------------------ | ------------------------------------------ |
| [Getting started](docs/getting-started.md) | Install → offline app → live data          |
| [Querying data](docs/querying-data.md)     | Elements, datasources, timeseries, storage |
| [Authentication](docs/authentication.md)   | Client registration, scopes, PKCE, tokens  |
| [Demo mode](docs/demo-mode.md)             | Deterministic datasets, demo↔prod parity   |
| [Embedding](docs/embedding.md)             | Embed protocol v2                          |
| [Publishing](docs/publishing.md)           | App manifest + store checklist             |
| [API reference](docs/api-reference.md)     | Every export                               |

## Packages

| Package                          | Status   | What it is                                                                      |
| -------------------------------- | -------- | ------------------------------------------------------------------------------- |
| `@senseering/urbanos-core`       | stable   | Framework-agnostic client: auth, typed timeseries query builder, demo transport |
| `@senseering/urbanos-bridge`     | stable   | Embed protocol v2 (host + app sides), zero deps                                 |
| `@senseering/urbanos-demo`       | usable   | `defineDemoDataset` + seeded generators (`seededRng`, `dailyRhythm`)            |
| `@senseering/urbanos-manifest`   | usable   | App manifest schema (zod) + `defineAppManifest()`                               |
| `@senseering/urbanos-vue`        | usable   | Vue 3 composables + plugin (`createUrbanOS`, `useUrbanOS`, `useAppState`)       |
| `@senseering/urbanos-tokens`     | skeleton | Design tokens — not implemented yet                                             |
| `@senseering/urbanos-nuxt`       | skeleton | Nuxt module — not implemented yet                                               |
| `@senseering/urbanos-cli`        | skeleton | `urbanos` CLI — no commands yet                                                 |
| `@senseering/create-urbanos-app` | skeleton | Scaffolder — no templates yet                                                   |

`core` and `bridge` are substantial implementations; `demo`, `manifest`, and `vue`
are functional partials. The four skeletons export a version constant and nothing
else — we'd rather say so than have you plan around them. To start a project today,
copy [`examples/minimal-vanilla`](examples/minimal-vanilla).

## Developing

```bash
corepack enable
pnpm install
pnpm build      # tsc per package, topological order
pnpm test       # vitest
pnpm lint       # eslint (strict, no `any`)
pnpm typecheck
```

Node >= 22, pnpm 10 (pinned). Shared lint/format/tsconfig presets live at the repo
root. The dependency direction is enforced: `core` and `bridge` import no framework.

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[Apache-2.0](LICENSE) © dataMatters GmbH
