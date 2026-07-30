---
'@senseering/urbanos-core': minor
---

Add interactive OAuth for standalone third-party apps.

`PkceTokenProvider` implements the authorization-code + PKCE (S256) flow against
the gateway, with rotating refresh tokens. The consent step is shell-mediated by
design: the gateway's `POST /oauth/authorize` requires the user's Supabase
session as `subject_token`, which a third party must never see, so the browser is
redirected to the UDP shell's consent screen instead.

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
  Appendix B known-answer vector, which pins Go↔TS PKCE parity with the
  gateway's `pkceS256`.

Refresh coalescing is a correctness requirement, not an optimisation: the gateway
revokes an entire rotation family when a refresh token is reused, so concurrent
refreshes would end the session. `PkceTokenProvider.refresh()` shares one
in-flight request, and there is a test asserting five concurrent `getToken()`
calls produce exactly one token request.

All additive — no existing signature changed.
