---
'@senseering/urbanos-bridge': minor
---

Add `windowChannel`, the origin-validated `window.postMessage` adapter for embed
protocol v2, so the host↔guest handshake runs in a real browser iframe (not just
the in-memory test channel). Every post targets an explicit origin; every inbound
message is rejected unless its origin — and, when available, its source window —
matches the registered target, closing cross-frame spoofing. Defined structurally
(`WindowLike`/`MessageEventLike`) so the package stays DOM-lib-free and testable
without a DOM.
