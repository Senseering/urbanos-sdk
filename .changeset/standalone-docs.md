---
'@senseering/create-urbanos-app': patch
'@senseering/urbanos-manifest': patch
'@senseering/urbanos-bridge': patch
'@senseering/urbanos-tokens': patch
'@senseering/urbanos-core': patch
'@senseering/urbanos-demo': patch
'@senseering/urbanos-nuxt': patch
'@senseering/urbanos-cli': patch
'@senseering/urbanos-vue': patch
---

Documentation: add a full developer guide under `docs/` (getting started,
authentication, querying data, demo mode, embedding, publishing, API reference) and
replace the placeholder package READMEs with real install + usage docs.

Doc comments only — no API or behaviour changes. Corrected the example gateway and
shell origins in the `PkceTokenProvider` JSDoc, and the READMEs now state honestly
that `urbanos-cli`, `urbanos-nuxt`, `urbanos-tokens`, and `create-urbanos-app` are
unimplemented skeletons, that `urbanos-vue` ships no `Uos*` components, and that
`ingest()` has no live gateway endpoint (demo transport only).
