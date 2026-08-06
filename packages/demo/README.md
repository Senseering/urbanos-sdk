# @datamatters-gmbh/urbanos-demo

Deterministic, seeded data generators plus `defineDemoDataset()` — builds the
`DemoDataset` that `DemoTransport` (in `@datamatters-gmbh/urbanos-core`) consumes.

Because demo reads run through the same aggregation engine as production, demo mode
behaves identically to real mode.

## Install

```bash
pnpm add @datamatters-gmbh/urbanos-demo @datamatters-gmbh/urbanos-core
```

## Use

```ts
import { dailyRhythm, defineDemoDataset, seededRng } from '@datamatters-gmbh/urbanos-demo';
import { DemoTransport, UrbanOSClient } from '@datamatters-gmbh/urbanos-core';

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

- [Demo mode](https://github.com/Senseering/urbanos-sdk/blob/main/docs/demo-mode.md) — datasets, generators, resolution
- [API reference](https://github.com/Senseering/urbanos-sdk/blob/main/docs/api-reference.md#datamatters-gmbhurbanos-demo)
