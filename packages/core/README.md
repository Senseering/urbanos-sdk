# @datamatters-gmbh/urbanos-core

The framework-agnostic urbanOS client: the `Transport` contract, `UrbanOSClient`,
HTTP and demo transports, OAuth token providers, the timeseries query builder, and
the classification + aggregation engines.

Zero runtime dependencies. ESM only.

## Install

```bash
pnpm add @datamatters-gmbh/urbanos-core
```

Public npm — no registry config or token needed.

## Use

```ts
import { HttpTransport, UrbanOSClient, PkceTokenProvider } from '@datamatters-gmbh/urbanos-core';

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

- [Querying data](https://github.com/Senseering/urbanos-sdk/blob/main/docs/querying-data.md) — the client API
- [Authentication](https://github.com/Senseering/urbanos-sdk/blob/main/docs/authentication.md) — scopes, PKCE, embedded tokens
- [Server credentials](https://github.com/Senseering/urbanos-sdk/blob/main/docs/server-credentials.md) — login-free backend access and target discovery
- [API reference](https://github.com/Senseering/urbanos-sdk/blob/main/docs/api-reference.md#datamatters-gmbhurbanos-core) — every export
