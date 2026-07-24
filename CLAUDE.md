# CLAUDE.md — urbanos-sdk

Guidance for Claude Code working in **this repo**. Overrides the generic
`~/CLAUDE.md`.

## What this is

The **`@senseering/*` TypeScript SDK** — a pnpm monorepo (Node ≥22, ESM,
versions pinned via the pnpm **catalog**) published to **private GitHub
Packages**. It is the one integration surface for the whole platform: the
`Transport` data contract, `UrbanOSClient`, the embed bridge (protocol v2),
deterministic demo datasets, and the app manifest schema. Framework-agnostic
core; thin Vue/Nuxt bindings on top.

## The urbanOS ecosystem

urbanOS v2 is split across sibling repos — clone them next to each other under
`../`. This repo is one of them.

| Repo                   | What it is                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **urbanos-apps**       | The UDP shell + all first-party app SPAs on the `@udp/*` layers. The SDK's main consumer.                                                                                                        |
| **urbanos-sdk**        | This repo — the `@senseering/*` TypeScript SDK (private GitHub Packages): the `Transport` contract, `UrbanOSClient`, the embed bridge, demo datasets, app manifest. The one integration surface. |
| **urbanos-platform**   | The Go API gateway (`/v1` OAuth 2.1 + timeseries/storage/catalog) + the Supabase DB migrations (`packages/db`) + the shared conformance vectors (`packages/conformance`).                        |
| **dM-urbanOS-website** | Nuxt 4 brand/marketing site (`../dM-urbanOS-website*` — the clone may carry a suffix). Every app gets a landing page here.                                                                       |
| **dm-frontend-pwa**    | The v1 monorepo — **READ-ONLY reference** for the visual 1:1 rebuild. Never modify.                                                                                                              |

**How they connect:**

- urbanos-apps consumes the SDK as **versioned deps from GitHub Packages**
  (`@senseering/urbanos-core|bridge|demo|manifest`), exactly like a third party —
  never workspace-linked.
- Data flows through an SDK `Transport` implemented in
  `urbanos-apps/packages/app-kit/src/transport/` (Host / Proxy / Null / Demo). The
  **gateway cutover** (urbanos-platform `/v1`) is a config-level swap of that
  transport for the SDK's `HttpTransport` — no app rewrite.
- **Conformance vectors** (Go↔TS parity for classify + aggregation) have their
  source of truth in `urbanos-platform/packages/conformance/fixtures`, hand-copied
  into `urbanos-sdk/packages/core/src/__fixtures__` until
  `@senseering/urbanos-conformance` is published. Change one side, change both.
- App DB schemas + migrations live in `urbanos-platform/packages/db`; schema docs
  (tbls) in `urbanos-platform/docs/database`.

## Workspace layout (packages/*, scope `@senseering/*`)

| Package            | State    | Purpose                                                                                                                   |
| ------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| `urbanos-core`     | **real** | `Transport` interface + `UrbanOSClient` + `HttpTransport`/`DemoTransport`, `classify`, aggregation engine, query builder. |
| `urbanos-bridge`   | **real** | Embed protocol v2 (host + app sides), zero deps.                                                                          |
| `urbanos-demo`     | partial  | `defineDemoDataset` + seeded RNG (`seededRng`, `dailyRhythm`).                                                            |
| `urbanos-manifest` | partial  | App manifest schema (zod) + `defineAppManifest()`.                                                                        |
| `urbanos-vue`      | partial  | Vue 3 composables + `Uos*` state components.                                                                              |
| `urbanos-nuxt`     | skeleton | Nuxt module wrapping the Vue bindings.                                                                                    |
| `urbanos-tokens`   | skeleton | Design tokens (CSS vars, Tailwind preset).                                                                                |
| `urbanos-cli`      | skeleton | `urbanos` CLI (mock gateway, host simulator).                                                                             |

Also: `create-urbanos-app` (npm scaffolder), `examples/minimal-vanilla`.
**The root README calls everything "Phase 0 skeletons" — that's stale; `core`
and `bridge` are substantial real implementations. Trust the code.**

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
  "Version Packages" PR; merging it publishes to GitHub Packages
  (`@senseering` scope, `access: restricted`). Auth env: `NODE_AUTH_TOKEN`.

## Hard rules (learned the hard way)

- **Branch:** `main`. Every PR that changes `packages/**` **must** include a
  changeset (`pnpm changeset`) or CI fails.
- **`Transport` is THE contract** (`packages/core/src/client/transport.ts`):
  `getElement`, `listDatasources`, `queryTimeseries`, `ingest`, get/putStorage.
  Its DTOs mirror the gateway `/v1` surface. Changing them **ripples into
  urbanos-apps transports** — check `../urbanos-apps/packages/app-kit/src/transport/`
  before touching DTOs.
- **The bridge is not a data proxy.** The user session never crosses the bridge;
  the host mints a scoped app token + delivers context. Only `token.get` is
  req/res.
- **Conformance vectors are hand-synced copies.** Source of truth lives in
  urbanos-platform; the copies under `packages/core/src/__fixtures__` pin Go↔TS
  parity. Breaking either file breaks demo↔prod equivalence.
- **Demo == prod semantics:** `DemoTransport` uses the same aggregation engine as
  the gateway so `?demo=true` matches real mode. Keep it deterministic (seeded).

## Platform standards (subset — canonical list lives in `urbanos-apps/CLAUDE.md`)

The full 13 platform standards are maintained in **urbanos-apps/CLAUDE.md**.
Those that bind SDK work here:

- **Everything tested** — co-located `*.test.ts`; conformance vectors + bridge
  handshake covered; CI green.
- **Code is English** — identifiers/comments/files in English; the SDK carries no
  UI strings.
- **New standards → CLAUDE.md** — decide a standard, record it in urbanos-apps
  (canonical) and reflect the relevant bit here; re-sync AGENTS.md.
- **Consumer awareness** — the SDK is a published dependency; treat every
  exported type as a contract. Breaking changes need a major changeset and a note
  for the urbanos-apps transports.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
