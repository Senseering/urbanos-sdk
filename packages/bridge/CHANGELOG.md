# @datamatters-gmbh/urbanos-bridge

## 0.5.0

### Minor Changes

- Add mandate context (AccessToken.mandateId, BridgeContext.mandate, UrbanOSClient.mandateId())

  Mandates are a sub-tenant grouping within an element. The gateway bakes the
  active mandate into the app access token (JWT `mid` claim and an optional
  `mandate_id` in the token response), and the embed host delivers it over the
  bridge context.

  - `AccessToken.mandateId?: number` — mapped from `mandate_id`, falling back to
    decoding the token's `mid` claim (new `readMandateClaim`); undefined at
    instance level.
  - `BridgeContext.mandate?: { id; name; role }` — optional and additive; old
    hosts that omit it still validate, and it may change through `context.changed`
    on a mandate switch. `UrbanOSContext` gains the matching optional field.
  - `UrbanOSClient.mandateId(): Promise<number | undefined>` — reads the active
    mandate from an optionally-wired `TokenProvider` (`new UrbanOSClient(transport,
{ tokens })`). Existing single-argument construction is unchanged.

## 0.4.0

### Minor Changes

- c20241b: Move to public npm under the `@datamatters-gmbh` scope.

  Packages were previously published to GitHub Packages as `@senseering/*`, which
  required every consumer to create a GitHub token with `read:packages` just to
  install — GitHub's npm registry authenticates downloads even for public packages.
  Installing is now a plain `pnpm add`, with no registry configuration and no token.

  **Renaming your imports is the whole migration:**

  ```diff
  -import { UrbanOSClient } from '@senseering/urbanos-core';
  +import { UrbanOSClient } from '@datamatters-gmbh/urbanos-core';
  ```

  You can also drop the `@senseering:registry` line and the `read:packages` token
  from your `.npmrc`. No API changed as part of the move. The `@senseering/*`
  packages on GitHub Packages stay published at their last version but receive no
  further releases.

  Published tarballs no longer contain `.js.map` / `.d.ts.map` files. They were dead
  weight: `files` only packs `dist`, so the maps pointed at `../src/*.ts` paths that
  were never in the tarball and resolved to nothing. Source is on GitHub. Every
  package now also ships its own `LICENSE` alongside its `README`.

### Patch Changes

- 0f70761: Documentation: add a full developer guide under `docs/` (getting started,
  authentication, querying data, demo mode, embedding, publishing, API reference) and
  replace the placeholder package READMEs with real install + usage docs.

  Doc comments only — no API or behaviour changes. Corrected the example gateway and
  shell origins in the `PkceTokenProvider` JSDoc, and the READMEs now state honestly
  that `urbanos-cli`, `urbanos-nuxt`, `urbanos-tokens`, and `create-urbanos-app` are
  unimplemented skeletons, that `urbanos-vue` ships no `Uos*` components, and that
  `ingest()` has no live gateway endpoint (demo transport only).

## 0.3.0

### Minor Changes

- 01d6f81: Complete the embed protocol v2 message set beyond the token/context core:

  - **`ready`** (guest → host) — the app mounted and connected; `host.onReady()`.
  - **`navigate`** (host → guest) — deep-link the embedded app; `host.navigate(path)`
    / `bridge.onNavigate()`.
  - **`route.changed`** (guest → host) — mirror the app's route into the shell URL;
    `bridge.notifyRoute(path)` / `host.onRouteChanged()`.
  - **`resize`** (guest → host) — request a content height; `bridge.requestResize(px)`
    / `host.onResize()`.
  - **`ui.toast`** (guest → host) — show a toast in the shell chrome;
    `bridge.toast({title})` / `host.onToast()`.

  All fire-and-forget events over the same envelope; the user session still never
  crosses the bridge.

## 0.2.0

### Minor Changes

- 738ab77: Add `windowChannel`, the origin-validated `window.postMessage` adapter for embed
  protocol v2, so the host↔guest handshake runs in a real browser iframe (not just
  the in-memory test channel). Every post targets an explicit origin; every inbound
  message is rejected unless its origin — and, when available, its source window —
  matches the registered target, closing cross-frame spoofing. Defined structurally
  (`WindowLike`/`MessageEventLike`) so the package stays DOM-lib-free and testable
  without a DOM.

## 0.1.0

### Minor Changes

- Phase 1: first real implementation — framework-agnostic client, typed timeseries query builder,
  HTTP + demo transports (with the local aggregation engine kept in Go↔TS conformance parity),
  embed protocol v2, app manifest schema, seeded demo generators, and Vue bindings.
