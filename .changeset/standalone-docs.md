---
'@datamatters-gmbh/create-urbanos-app': patch
'@datamatters-gmbh/urbanos-manifest': patch
'@datamatters-gmbh/urbanos-bridge': patch
'@datamatters-gmbh/urbanos-tokens': patch
'@datamatters-gmbh/urbanos-core': patch
'@datamatters-gmbh/urbanos-demo': patch
'@datamatters-gmbh/urbanos-nuxt': patch
'@datamatters-gmbh/urbanos-cli': patch
'@datamatters-gmbh/urbanos-vue': patch
---

Documentation: add a full developer guide under `docs/` (getting started,
authentication, querying data, demo mode, embedding, publishing, API reference) and
replace the placeholder package READMEs with real install + usage docs.

Doc comments only — no API or behaviour changes. Corrected the example gateway and
shell origins in the `PkceTokenProvider` JSDoc, and the READMEs now state honestly
that `urbanos-cli`, `urbanos-nuxt`, `urbanos-tokens`, and `create-urbanos-app` are
unimplemented skeletons, that `urbanos-vue` ships no `Uos*` components, and that
`ingest()` has no live gateway endpoint (demo transport only).
