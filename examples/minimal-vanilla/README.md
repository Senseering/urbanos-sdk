# minimal-vanilla

The smallest urbanOS app: build a deterministic demo dataset and query it through
the SDK client — no gateway, no network, no auth.

```bash
pnpm --filter @urbanos-examples/minimal-vanilla build
pnpm --filter @urbanos-examples/minimal-vanilla start
```

It defines two datasources (a car park and a noise sensor), then reads the element,
filters datasources by category, and runs an hourly-average timeseries query.

The same `UrbanOSClient` code, given an `HttpTransport` instead of a
`DemoTransport`, runs against the real gateway. That's the point: one codebase,
two modes.

This is also the best starting point for a new app — copy the directory and replace
the dataset. See [getting started](../../docs/getting-started.md).
