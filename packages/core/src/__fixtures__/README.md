# Conformance fixtures (synced)

These vectors are the **source of truth for Go↔TS parity**. The gateway
(`urbanos-platform/apps/gateway/internal/{classify,timeseries}`) and this SDK's
classification + aggregation engines both run them; when both pass, demo mode
matches production.

**Source of truth:** `urbanos-platform/packages/conformance/fixtures`. These files
are copied from there. Until `@senseering/urbanos-conformance` is published to
GitHub Packages, keep them in sync by copying on change (a CI drift check will
enforce this once the package is published — see docs/v2-migration/04-sdk.md §8).
