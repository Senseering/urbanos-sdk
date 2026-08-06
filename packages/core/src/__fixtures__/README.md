# Conformance fixtures

These vectors are the **contract for demo↔production parity**.

Two engines must produce byte-identical output for every case here: this SDK's
local `classify` + aggregation implementations, and the ones inside the urbanOS
gateway. When both pass, an app running in demo mode against `DemoTransport`
behaves the same as the same app running live against `HttpTransport`.

- `classification.cases.json` — datasource/stream shapes → expected `Category`.
- `aggregation.cases.json` — samples + an aggregate spec → expected buckets.

Each file is versioned (`version: 1`) so a vector set can evolve without silently
changing meaning.

**Editing these files changes the contract.** A case is not a test fixture you
adjust to make a test pass — if a vector fails, the engine is wrong, not the
vector. Adding or changing a case requires the corresponding change on the
gateway side, or demo mode and production drift apart.
