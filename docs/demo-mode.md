# Demo mode

Demo mode runs your app against a deterministic in-memory dataset. No token, no
network, no platform access.

It exists for three reasons: you can build the whole app before you have
credentials; the store can show a live preview to someone who isn't signed in; and
your tests get a real data source instead of mocks.

- [Why demo output matches production](#why-demo-output-matches-production)
- [Defining a dataset](#defining-a-dataset)
- [Generators](#generators)
- [Sample resolution](#sample-resolution)
- [Switching modes](#switching-modes)
- [What DemoTransport does](#what-demotransport-does)

## Why demo output matches production

`DemoTransport` doesn't approximate the gateway — it runs **the same aggregation and
classification engines**, and both implementations are pinned against a shared set of
conformance vectors. When those pass on both sides, bucket boundaries, gap filling,
and category assignment are identical.

That's the guarantee: a chart that looks right in demo looks right in production.

## Defining a dataset

A `DemoDataset` is three things: a tenant, some entities, and a `sample()` function.

```ts
import { defineDemoDataset, dailyRhythm, seededRng } from '@senseering/urbanos-demo';

const rng = seededRng(1337);

const dataset = defineDemoDataset({
  seed: 1337,
  tenant: { id: 42, name: 'Demo-Stadt Köln' },
  entities: [
    {
      id: 1,
      name: 'Parkplatz P1',
      category: 'parking',
      lat: 50.9413,
      long: 6.9583,
      streams: [{ id: 11, name: 'occupied', unit: 'bool' }],
    },
  ],
  generators: {
    11: dailyRhythm({ base: 0.5, amplitude: 0.4, peakHour: 13, noise: 0.1, rng }),
  },
});
```

`generators` maps **stream id** → `(at: Date) => number | null`. Returning `null`
produces a gap, which is how you exercise your gap-filling and empty states.

> **`seed` is not what makes this deterministic.** `defineDemoDataset` accepts it but
> doesn't use it — determinism comes from the `rng` you pass into your generators.
> Always pass `rng: seededRng(n)` when you use `noise`, or your demo will differ on
> every reload.

You don't need `@senseering/urbanos-demo` at all. Any object with the right shape
works:

```ts
const dataset: DemoDataset = {
  tenant: { id: 1, name: 'Test' },
  entities: [...],
  sample: (streamId, at) => at.getUTCHours(),
};
```

## Generators

### `seededRng(seed)`

A Mulberry32 PRNG returning values in `[0, 1)`. Same seed, same sequence, forever.

```ts
const rng = seededRng(1337);
```

### `dailyRhythm(opts)`

A sine wave over the day — the shape most city data actually has.

```ts
dailyRhythm({
  base: 55, // baseline value
  amplitude: 8, // swing above and below base
  peakHour: 18, // UTC hour of the peak (default 13)
  noise: 0.1, // fraction of amplitude (default 0)
  rng, // REQUIRED for noise to apply
});
```

Returns `(at: Date) => number`, rounded to two decimals. Hours are **UTC**. Noise is
applied only when `noise > 0` _and_ `rng` is supplied — pass both or neither.

### Writing your own

Generators are plain functions, so anything goes:

```ts
// A weekday/weekend pattern with a nightly gap.
const traffic = (at: Date): number | null => {
  const h = at.getUTCHours();
  if (h < 5) return null; // sensor offline overnight
  const weekend = [0, 6].includes(at.getUTCDay());
  return Math.round((weekend ? 40 : 120) * (1 + Math.sin((h / 24) * 2 * Math.PI)));
};
```

Keep them pure and time-derived. A generator that closes over mutable state breaks
determinism as surely as an unseeded RNG.

## Sample resolution

`DemoTransport` generates one sample per `resolutionMs`, **defaulting to one hour**.

```ts
new DemoTransport(dataset, { resolutionMs: 15 * 60_000 }); // 15-minute data
```

> This is the single most common demo-mode surprise: with the default, a `1m` bucket
> yields a series where almost every bucket is empty. Match `resolutionMs` to the
> finest bucket your app charts.

Other defaults: omitting `from`/`until` gives the **last 24 hours** ending now, and
sample timestamps are floor-aligned to `resolutionMs`.

## Switching modes

Pick a transport at startup. Nothing downstream changes.

```ts
const isDemo = new URLSearchParams(location.search).get('demo') === 'true';

const client = new UrbanOSClient(
  isDemo
    ? new DemoTransport(dataset, { resolutionMs: 15 * 60_000 })
    : new HttpTransport({ baseUrl, tokens }),
);
```

**When embedded, the bridge context wins over the query string:**

```ts
const isDemo = bridge.context.demo ?? route.query.demo === 'true';
```

The host sets both — `?demo=true` on the iframe URL _and_ `demo: true` in the
context — but the context is authoritative. The query param is the fallback for a
failed handshake and for standalone apps opened directly.

**A demo app must hold no credential and reach no real data.** The host enforces
this: in demo mode it refuses to mint a token at all. If your app tries to fetch live
data in demo mode, it fails — by design.

Declare demo support in your [manifest](publishing.md):

```ts
demo: { available: true, entryPath: '/?demo=true' }
```

## What DemoTransport does

| Call                | Behaviour                                                              |
| ------------------- | ---------------------------------------------------------------------- |
| `getElement()`      | Returns `dataset.tenant`                                               |
| `listDatasources()` | Maps entities; fills `element_id` from the tenant; filters by category |
| `queryTimeseries()` | Walks `sample()` at `resolutionMs`; aggregates via the real engine     |
| `getStorage`/`put`  | In-memory `Map`, per instance, not persisted                           |

An unknown stream id returns `{ status: 404, error: 'not found', points: [] }` —
matching production, where a per-query failure is a result, not an exception. Your
error handling gets exercised in demo too.

## Testing with it

Because it's deterministic, `DemoTransport` makes a better test fixture than a mock:

```ts
import { DemoTransport, UrbanOSClient } from '@senseering/urbanos-core';

it('averages hourly noise', async () => {
  const client = new UrbanOSClient(
    new DemoTransport({
      tenant: { id: 1, name: 'Test' },
      entities: [
        {
          id: 1,
          name: 'S',
          category: 'noise',
          lat: 0,
          long: 0,
          streams: [{ id: 10, name: 'LAeq', unit: 'dB' }],
        },
      ],
      sample: (_id, at) => at.getUTCHours(),
    }),
  );

  const res = await client
    .timeseries(10)
    .range({ last: '24h' })
    .aggregate('avg', { bucket: '1h' })
    .execute();

  expect(res.status).toBe(200);
  expect(res.points.length).toBeGreaterThan(0);
});
```
