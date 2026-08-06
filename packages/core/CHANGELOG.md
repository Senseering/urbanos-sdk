# @datamatters-gmbh/urbanos-core

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

- 6dbabdc: Add interactive OAuth for standalone third-party apps.

  `PkceTokenProvider` implements the authorization-code + PKCE (S256) flow against
  the gateway, with rotating refresh tokens. The consent step is shell-mediated by
  design: the gateway's `POST /oauth/authorize` requires the user's platform
  session as `subject_token`, which a third party must never see, so the browser is
  redirected to the urbanOS shell's consent screen instead.

  `HostTokenProvider` adapts the embed bridge to the same `TokenProvider`
  interface, so embedded and standalone apps are interchangeable from
  `HttpTransport`'s point of view. It is declared structurally, so `core` keeps its
  zero-dependency rule — `AppBridge` satisfies it without an import.

  Core stays isomorphic: PKCE's browser needs (WebCrypto, storage across the
  redirect, navigation) are injection seams following the `channel.ts` precedent —
  structural interfaces with defaults that throw rather than assume a browser.
  `memoryStorage()` ships as a real export and doubles as the test fake.

  Also:

  - `HttpTransport` now retries once with a refreshed token after a 401
    (`retryOnUnauthorized`, default true). Both request paths route through one
    authenticated fetch, which fixes `getStorage()` surfacing a 401 as
    `GatewayError` instead of `AuthError`.
  - New `ConsentError` for the gateway's 428, and a stable `code` on every error.
    `code` is dup-proof where `instanceof` is not — consumers pin exact versions,
    so a transitive duplicate copy of the package would break `instanceof` checks.
  - First tests for `HttpTransport` and the auth module, including the RFC 7636
    Appendix B known-answer vector, which pins PKCE parity with the gateway.

  Refresh coalescing is a correctness requirement, not an optimisation: the gateway
  revokes an entire rotation family when a refresh token is reused, so concurrent
  refreshes would end the session. `PkceTokenProvider.refresh()` shares one
  in-flight request, and there is a test asserting five concurrent `getToken()`
  calls produce exactly one token request.

  All additive — no existing signature changed.

- 0f70761: **Breaking:** remove `ingest()` and the `IngestPoint` type.

  The SDK is read-only over platform data and always has been. `HttpTransport.ingest()`
  POSTed to `/v1/timeseries/ingest`, an endpoint the gateway does not expose, and no
  scope can authorise a timeseries write — `data:write:*` is ungrantable at every
  client tier, enforced both in the gateway's scope ceiling and by a database
  constraint. The method could only ever fail against a real gateway. Against
  `DemoTransport` it "succeeded" by counting points and discarding them, which made it
  look functional in demo mode and fail in production — the worst possible shape for an
  API.

  Removed from `Transport`, `UrbanOSClient`, `HttpTransport`, and `DemoTransport`,
  along with the now-unused `IngestPoint` export.

  **Migration:** there is no replacement. Sensor data enters the platform through the
  ingest pipeline, not through app clients. An app's only write surface is
  `putStorage` / `client.storage.put()`. If you call `client.ingest()` today, it is
  already failing against the gateway — delete the call.

  Note this is a `minor` bump rather than `major` because core is pre-1.0, where
  semver puts breaking changes in the minor slot; `0.1.x → 0.2.0` signals the break
  without declaring 1.0 API stability.

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
