# @datamatters-gmbh/urbanos-core

## 0.4.0

### Minor Changes

- aea3f7e: Add `PkceTokenProvider.setActiveMandate()` for standalone mandate scoping

  The standalone (PKCE) login yields an instance-level token (`mid=0`), so a
  standalone third-party app cannot see mandate-scoped datasources until it binds a
  mandate. `setActiveMandate(id)` re-mints the token bound to that mandate via the
  gateway's refresh grant (which now accepts `mandate_id` and validates
  membership); the binding rides along on every subsequent silent refresh, and
  switching mandate is another call. `activeMandate()` reads the current binding.
  Embedded apps are unaffected — the host still delivers a mandate-bound token over
  the bridge.

  `OAuthHttp.token()` now accepts numeric body fields so `mandate_id` reaches the
  gateway as a JSON number.

### Patch Changes

- b21879b: Fix `pkce: state mismatch` when more than one authorization is started

  `PkceTokenProvider` kept the pending transaction in a single `sessionStorage`
  slot, so every `beginAuthorization()` overwrote the previous one. Any second
  start orphaned the first — two tabs, a double-clicked sign-in button, or simply
  retrying after an error — and when that earlier callback came back it failed the
  CSRF gate with `pkce: state mismatch`, which looked like an integration mistake
  rather than the SDK discarding its own transaction.

  Pending authorizations are now keyed by `state`, so concurrent flows coexist and
  completing one leaves the others untouched. The security properties are
  unchanged: a state is still only accepted if the SDK minted it, it is still
  consumed exactly once, and the transaction is still loaded and deleted
  synchronously before the first `await`, so a React StrictMode double-mount still
  cannot produce two code exchanges.

  Storage stays bounded — at most 10 pending authorizations, with expired ones
  (older than the gateway's 10-minute code TTL) pruned on write. A transaction
  written by an older version is migrated on read, so a redirect already in flight
  during an upgrade still completes.

## 0.3.0

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
