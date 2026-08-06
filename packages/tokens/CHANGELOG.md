# @datamatters-gmbh/urbanos-tokens

## 0.2.0

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

## 0.1.0

### Minor Changes

- Phase 1: first real implementation — framework-agnostic client, typed timeseries query builder,
  HTTP + demo transports (with the local aggregation engine kept in Go↔TS conformance parity),
  embed protocol v2, app manifest schema, seeded demo generators, and Vue bindings.
