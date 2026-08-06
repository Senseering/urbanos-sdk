# @senseering/urbanos-demo

Deterministic, seeded data generators plus `defineDemoDataset()` — builds the
`DemoDataset` that `DemoTransport` (in `@senseering/urbanos-core`) consumes.

Because demo reads run through the same aggregation engine as production, demo mode
behaves identically to real mode.

## Install

```bash
pnpm add @senseering/urbanos-demo @senseering/urbanos-core
```

## Use

```ts
import { dailyRhythm, defineDemoDataset, seededRng } from '@senseering/urbanos-demo';
import { DemoTransport, UrbanOSClient } from '@senseering/urbanos-core';

const rng = seededRng(1337);

const dataset = defineDemoDataset({
  seed: 1337,
  tenant: { id: 42, name: 'Demo-Stadt Köln' },
  entities: [
    {
      id: 2,
      name: 'Schallpegel Dom',
      category: 'noise',
      lat: 50.9413,
      long: 6.958,
      streams: [{ id: 21, name: 'LAeq', unit: 'dB' }],
    },
  ],
  generators: {
    21: dailyRhythm({ base: 55, amplitude: 8, peakHour: 18, noise: 0.1, rng }),
  },
});

const client = new UrbanOSClient(new DemoTransport(dataset));
```

Determinism comes from the `rng` you pass into generators — always seed it.

## Docs

- [Demo mode](../../docs/demo-mode.md) — datasets, generators, resolution
- [API reference](../../docs/api-reference.md#senseeringurbanos-demo)
