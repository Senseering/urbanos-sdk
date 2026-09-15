---
'@datamatters-gmbh/urbanos-core': major
---

Match the gateway's legacy stream-name unit fallbacks and display-value
conversions in DemoTransport. Pressure values below 10,000 multiply by 100 for
`pressure` and `pressure_hpa`; `uv` values divide by 227. Conversions run once
after aggregation. Existing nonblank units stay unchanged, including legacy
cases where the label conflicts with a converted value.

Migration: supply original source units and unconverted samples to demo datasets.
Remove client-side conversions from gateway response handling and clear metadata
and reading caches at rollout. HttpTransport passes through gateway values without
converting them again. These rules reproduce legacy heuristics rather than
calibrating devices. See `docs/querying-data.md` for the compatibility limitations.
