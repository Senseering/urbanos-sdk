---
'@datamatters-gmbh/urbanos-core': minor
---

Accept one server API key in UrbanOSServiceClient. The SDK handles token acquisition,
renewal and per-organisation caching; scopes can be omitted to use the key's approved
permissions. Existing credential types remain supported. Reject non-HTTPS remote
endpoints and token-endpoint redirects to protect server credentials.
