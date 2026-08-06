# CLAUDE.md — urbanos-sdk

Guidance for Claude Code working in **this repo**. Overrides the generic
`~/CLAUDE.md`.

## What this is

The **`@datamatters-gmbh/*` TypeScript SDK** — a pnpm monorepo (Node ≥22, ESM,
versions pinned via the pnpm **catalog**) published to **public npm**. It is
the one integration surface for the urbanOS platform: the `Transport` data
contract, `UrbanOSClient`, the embed bridge (protocol v2), deterministic demo
datasets, and the app manifest schema. Framework-agnostic core; thin Vue/Nuxt
bindings on top.

This repo is **self-contained**. Everything needed to understand, build, and
document the SDK lives here. Do not add references to other repositories.

## Where the docs live

`docs/` is the developer-facing documentation — the same pages a third-party app
developer reads:

| Page                      | Covers                                                        |
| ------------------------- | ------------------------------------------------------------- |
| `docs/getting-started.md` | Install, demo-mode hello world, swapping to live data         |
| `docs/authentication.md`  | Client registration, scopes, PKCE, embedded tokens, CORS      |
| `docs/querying-data.md`   | `element`, `datasources`, timeseries builder, storage, errors |
| `docs/demo-mode.md`       | `defineDemoDataset`, seeded generators, demo↔prod parity      |
| `docs/embedding.md`       | Embed protocol v2 (app side + host side)                      |
| `docs/publishing.md`      | App manifest reference + store checklist                      |
| `docs/api-reference.md`   | Export index per package                                      |

When you change a public API, update the matching page in the same PR.

## Workspace layout (packages/*, scope `@datamatters-gmbh/*`)

| Package            | State    | Purpose                                                                                                                   |
| ------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| `urbanos-core`     | **real** | `Transport` interface + `UrbanOSClient` + `HttpTransport`/`DemoTransport`, `classify`, aggregation engine, query builder. |
| `urbanos-bridge`   | **real** | Embed protocol v2 (host + app sides), zero deps.                                                                          |
| `urbanos-demo`     | partial  | `defineDemoDataset` + seeded RNG (`seededRng`, `dailyRhythm`).                                                            |
| `urbanos-manifest` | partial  | App manifest schema (zod) + `defineAppManifest()`.                                                                        |
| `urbanos-vue`      | partial  | Vue 3 composables + plugin (`createUrbanOS`, `useUrbanOS`, `useAppState`); no `Uos*` components.                          |
| `urbanos-nuxt`     | skeleton | Nuxt module wrapping the Vue bindings.                                                                                    |
| `urbanos-tokens`   | skeleton | Design tokens (CSS vars, Tailwind preset).                                                                                |
| `urbanos-cli`      | skeleton | `urbanos` CLI (mock gateway, host simulator).                                                                             |

Also: `create-urbanos-app` (npm scaffolder), `examples/minimal-vanilla`.
**`nuxt`/`tokens`/`cli`/`create-urbanos-app` are true skeletons — one exported
constant each, no commands and no templates. `core`/`bridge` are substantial
implementations; `demo`/`manifest`/`vue` are functional partials. Trust the code
over any "Phase 0" labels left in older docs.**

## Commands

```bash
pnpm build | typecheck | lint | test    # per-package tsc (topological) + vitest
pnpm changeset                           # REQUIRED on every PR touching packages/**
pnpm version-packages                    # changeset version (done via the Version PR)
pnpm release                             # pnpm build && changeset publish
```

- CI (`.github/workflows/ci.yml`): `format → build → lint → typecheck → test`,
  plus a PR-only **changeset** job (`changeset status --since=origin/main`) that
  fails a `packages/**` PR with no changeset.
- Release (`.github/workflows/release.yml`, changesets): push to `main` opens a
  "Version Packages" PR; merging it publishes to **public npm**
  (`@datamatters-gmbh` scope). Auth: `secrets.NPM_TOKEN` → `NODE_AUTH_TOKEN`.
  CI also packs every package and asserts tarball contents (no `.map` files,
  README + LICENSE present) — npm versions are immutable.
- **npm provenance is off until this repo is public.** npm only attests tarballs
  built from a public source repo. `id-token: write` is already in place; flip
  `NPM_CONFIG_PROVENANCE: 'true'` in `release.yml` when the repo opens up.

## Hard rules (learned the hard way)

- **Branch:** `main`. Every PR that changes `packages/**` **must** include a
  changeset (`pnpm changeset`) or CI fails. Comment-only edits count.
- **`Transport` is THE contract** (`packages/core/src/client/transport.ts`):
  `getElement`, `listDatasources`, `queryTimeseries`, get/putStorage.
  Its DTOs mirror the gateway `/v1` surface. **These types are published — every
  change is a breaking change for consumers** and needs a major changeset plus a
  migration note.
- **The bridge is not a data proxy.** The user session never crosses the bridge;
  the host mints a scoped app token + delivers context. Only `token.get` is
  req/res.
- **Conformance vectors pin demo↔prod parity.** The fixtures under
  `packages/core/src/__fixtures__` are run by this SDK's classification and
  aggregation engines and by the platform gateway. When both pass, demo mode
  behaves like production. Changing a vector without changing both engines
  breaks that guarantee — see `packages/core/src/__fixtures__/README.md`.
- **Demo == prod semantics:** `DemoTransport` uses the same aggregation engine as
  the gateway so demo mode matches real mode. Keep it deterministic (seeded).
- **The SDK is read-only over platform data.** There is no timeseries write path:
  the gateway exposes no ingest endpoint and `data:write:*` is ungrantable at
  every client tier. `ingest()` was removed in core 0.2.0. The only write surface
  an app has is `putStorage`.

## Platform standards

- **Everything tested** — co-located `*.test.ts`; conformance vectors + bridge
  handshake covered; CI green.
- **Code is English** — identifiers/comments/files in English; the SDK carries no
  UI strings.
- **Consumer awareness** — the SDK is a published dependency; treat every
  exported type as a contract. Breaking changes need a major changeset and a
  note in the affected `docs/` page.
- **New standards → CLAUDE.md** — decide a standard, record it here, and re-sync
  `AGENTS.md` (the two files are byte-identical).

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
