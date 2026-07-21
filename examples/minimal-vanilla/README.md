# minimal-vanilla

The smallest urbanOS app: build a deterministic demo dataset and query it through
the SDK client — no gateway, no network, no auth.

```bash
pnpm --filter @urbanos-examples/minimal-vanilla build
pnpm --filter @urbanos-examples/minimal-vanilla start
```

The same `UrbanOSClient` code, given an `HttpTransport` instead of a
`DemoTransport`, runs against the real gateway. That's the point: one codebase,
two modes. See [docs/v2-migration/04-sdk.md](https://github.com/Senseering/dm-frontend-pwa/blob/dev/docs/v2-migration/04-sdk.md).
