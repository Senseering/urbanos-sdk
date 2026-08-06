# urbanOS SDK

The developer SDK for building apps on the [urbanOS](https://urbanos.datamatters.io)
smart-city platform — the same SDK first-party apps use. Talk to the platform gateway
with typed clients, embed your app in the urbanOS shell, and run it fully offline in
demo mode.

**[→ Read the documentation](docs/README.md)**

## Install

```bash
pnpm add @datamatters-gmbh/urbanos-core @datamatters-gmbh/urbanos-demo
```

Public npm — no registry config and no token. Node ≥ 22, ESM only.

Full setup: [docs/getting-started.md](docs/getting-started.md).

## Thirty seconds

No credentials needed — demo mode runs offline:

```ts
import { DemoTransport, UrbanOSClient } from '@datamatters-gmbh/urbanos-core';
import { dailyRhythm, defineDemoDataset } from '@datamatters-gmbh/urbanos-demo';

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

| Package                                | Status   | What it is                                                                      |
| -------------------------------------- | -------- | ------------------------------------------------------------------------------- |
| `@datamatters-gmbh/urbanos-core`       | stable   | Framework-agnostic client: auth, typed timeseries query builder, demo transport |
| `@datamatters-gmbh/urbanos-bridge`     | stable   | Embed protocol v2 (host + app sides), zero deps                                 |
| `@datamatters-gmbh/urbanos-demo`       | usable   | `defineDemoDataset` + seeded generators (`seededRng`, `dailyRhythm`)            |
| `@datamatters-gmbh/urbanos-manifest`   | usable   | App manifest schema (zod) + `defineAppManifest()`                               |
| `@datamatters-gmbh/urbanos-vue`        | usable   | Vue 3 composables + plugin (`createUrbanOS`, `useUrbanOS`, `useAppState`)       |
| `@datamatters-gmbh/urbanos-tokens`     | skeleton | Design tokens — not implemented yet                                             |
| `@datamatters-gmbh/urbanos-nuxt`       | skeleton | Nuxt module — not implemented yet                                               |
| `@datamatters-gmbh/urbanos-cli`        | skeleton | `urbanos` CLI — no commands yet                                                 |
| `@datamatters-gmbh/create-urbanos-app` | skeleton | Scaffolder — no templates yet                                                   |

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
