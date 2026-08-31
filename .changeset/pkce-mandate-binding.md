---
'@datamatters-gmbh/urbanos-core': minor
---

Add `PkceTokenProvider.setActiveMandate()` for standalone mandate scoping

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
