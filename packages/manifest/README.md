# @senseering/urbanos-manifest

The app manifest schema (zod) plus `defineAppManifest()` — one declarative file per
app describing the store listing, the scopes it needs with localized consent reasons,
how it embeds, and whether it offers a demo.

## Install

```bash
pnpm add @senseering/urbanos-manifest
```

## Use

```ts
// urbanos.app.ts
import { defineAppManifest } from '@senseering/urbanos-manifest';

export default defineAppManifest({
  manifestVersion: 1,
  id: 'io.acme.air-quality',
  version: '1.2.0',
  name: { de: 'Luftqualität', en: 'Air Quality' },
  developer: { name: 'Acme GmbH', supportEmail: 'support@acme.example' },
  embed: { protocol: 2, hostOrigins: ['https://urbanos.udp.city'] },
  scopes: {
    required: [
      {
        scope: 'data:read:weather',
        reason: { de: 'Messwerte anzeigen', en: 'Show measurements' },
      },
    ],
  },
  demo: { available: true, entryPath: '/?demo=true' },
});
```

`defineAppManifest()` throws on invalid input. For structured errors use
`validateAppManifest(value)`, which returns `{ ok: true, manifest }` or
`{ ok: false, errors }`.

## Docs

- [Publishing](../../docs/publishing.md) — full field reference + store checklist
- [API reference](../../docs/api-reference.md#senseeringurbanos-manifest)
