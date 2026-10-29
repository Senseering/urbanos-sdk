---
'@datamatters-gmbh/urbanos-core': minor
---

Bound live HTTP reads to 15 seconds and 8 MiB before decoding. Preserve OAuth
refresh and existing Transport methods, expose actionable errors and Retry-After,
and add explicit OAuth history pagination without changing legacy batch results.
