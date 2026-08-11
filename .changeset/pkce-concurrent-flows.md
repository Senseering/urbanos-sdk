---
'@datamatters-gmbh/urbanos-core': patch
---

Fix `pkce: state mismatch` when more than one authorization is started

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
