# @senseering/urbanos-core

The framework-agnostic urbanOS client: the `Transport` contract, `UrbanOSClient`,
HTTP and demo transports, OAuth token providers, the timeseries query builder, and
the classification + aggregation engines.

Zero runtime dependencies. ESM only.

## Install

```bash
pnpm add @senseering/urbanos-core
```

Requires an `.npmrc` pointing `@senseering` at GitHub Packages — see
[getting started](../../docs/getting-started.md#installing-the-packages).

## Use

```ts
import { HttpTransport, UrbanOSClient, PkceTokenProvider } from '@senseering/urbanos-core';

const auth = new PkceTokenProvider({
  gatewayUrl: 'https://urbanos-gateway.udp.city',
  shellUrl: 'https://urbanos.udp.city',
  clientId: 'uos_c_abc123',
  redirectUri: 'https://app.example.com/callback',
  scopes: ['element:read', 'datasources:read', 'data:read:noise'],
});

const client = new UrbanOSClient(
  new HttpTransport({ baseUrl: 'https://urbanos-gateway.udp.city', tokens: auth }),
);

const noise = await client
  .timeseries(21)
  .range({ last: '24h' })
  .aggregate('avg', { bucket: '1h' })
  .execute();
```

Swap `HttpTransport` for `DemoTransport` to run offline — nothing else changes.

## Docs

- [Querying data](../../docs/querying-data.md) — the client API
- [Authentication](../../docs/authentication.md) — scopes, PKCE, embedded tokens
- [API reference](../../docs/api-reference.md#senseeringurbanos-core) — every export
