# @senseering/urbanos-bridge

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
