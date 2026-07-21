# urbanOS SDK

The developer SDK for building apps on the [urbanOS](https://urbanos.datamatters.io)
smart-city platform — the same SDK first-party apps use. Talk to the platform gateway with
typed clients, embed your app in the urbanOS shell, and run it fully offline in demo mode.

> **Status: incubating, published privately.** Packages ship to a **private GitHub Packages
> registry** under the `@senseering` scope while the SDK stabilises. The plan is to
> open-source it (Apache-2.0) under the public `@urbanos` npm scope. See
> [`docs/v2-migration/04-sdk.md`](https://github.com/Senseering/dm-frontend-pwa/blob/dev/docs/v2-migration/04-sdk.md).

## Packages

| Package                          | What it is                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------- |
| `@senseering/urbanos-core`       | Framework-agnostic client: auth, typed timeseries query builder, demo transport |
| `@senseering/urbanos-bridge`     | Embed protocol v2 (host + app sides), zero deps                                 |
| `@senseering/urbanos-demo`       | `DemoProvider` interface + seeded data generators                               |
| `@senseering/urbanos-manifest`   | App manifest schema (zod) + `defineAppManifest()`                               |
| `@senseering/urbanos-tokens`     | Design tokens (CSS variables, Tailwind preset)                                  |
| `@senseering/urbanos-vue`        | Vue 3 composables + `Uos*` state components                                     |
| `@senseering/urbanos-nuxt`       | Nuxt module wrapping the Vue bindings                                           |
| `@senseering/urbanos-cli`        | `urbanos` CLI: mock gateway, host simulator, manifest tools                     |
| `@senseering/create-urbanos-app` | `npm create` scaffolder                                                         |

## Consuming these packages

Add an `.npmrc` next to your project's:

```
@senseering:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Export `NODE_AUTH_TOKEN` (a GitHub PAT with `read:packages`) and install as usual.

## Developing

```bash
corepack enable
pnpm install
pnpm build      # tsc per package, topological order
pnpm test       # vitest
pnpm lint       # eslint (strict, no `any`)
pnpm typecheck
```

Node >= 22, pnpm 10 (pinned). See [CONTRIBUTING.md](CONTRIBUTING.md).

## Layout

```
packages/
  core/  bridge/  demo/  manifest/  tokens/  vue/  nuxt/  cli/
create-urbanos-app/
```

Shared lint/format/tsconfig presets live at the repo root (a single app of each tool),
not in a `config/` package.

These are **skeletons** (Phase 0 of the v2 migration): each package builds, lints, and has a
smoke test, but the real implementation lands in Phase 1. The dependency direction is already
enforced: `core` and `bridge` import no framework.
