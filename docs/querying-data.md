# Querying data

Everything the client can do. All of it works identically against `DemoTransport`
and `HttpTransport`.

- [The client](#the-client)
- [Elements](#elements)
- [Datasources and streams](#datasources-and-streams)
- [Timeseries](#timeseries)
- [App storage](#app-storage)
- [Error handling](#error-handling)
- [Limits](#limits)

## The client

`UrbanOSClient` takes a single argument — a transport. There is no options object
and no `createClient()` helper.

```ts
import { UrbanOSClient } from '@datamatters-gmbh/urbanos-core';

const client = new UrbanOSClient(transport);
```

| Member                      | Returns                          |
| --------------------------- | -------------------------------- |
| `client.element()`          | `Promise<ElementView>`           |
| `client.datasources(opts?)` | `Promise<DatasourceView[]>`      |
| `client.timeseries(id)`     | `TimeseriesQueryBuilder` (sync!) |
| `client.storage`            | property: `{ get, put }`         |

> **`client.storage` is a property, not a method** — `client.storage.get('k')`, not
> `client.storage().get('k')`.

> **The SDK is read-only over platform data.** There is no way to write
> measurements: the gateway exposes no ingest endpoint, and `data:write:*` scopes
> are ungrantable at every tier. Your app's only write surface is
> [app storage](#app-storage). (`client.ingest()` existed in core 0.1.x and was
> removed in 0.2.0 — it never had a live endpoint.)

## Elements

An **element** is the organisation/tenant your token is scoped to — typically a city
or municipal utility.

```ts
const element = await client.element();
// { id: 42, name: 'Demo-Stadt Köln' }
```

Requires the `element:read` scope in live mode.

## Datasources and streams

A **datasource** is a physical thing (a car park, a noise sensor). Each carries one
or more **streams** — the individual measured series.

```ts
const all = await client.datasources();
const parking = await client.datasources({ category: 'parking' });
```

```ts
interface DatasourceView {
  id: number;
  element_id: number; // Wire metadata uses snake_case.
  name: string;
  category: string;
  lat: number;
  long: number; // "long", not "lng" or "lon"
  streams: { id: number; name: string; unit: string }[];
  sensor_type?: string; // First-party metadata; may be absent.
  tags?: { id: number; name: string }[];
}
```

Requires `datasources:read`. An unknown category is not an error — you get an empty
list.

### Sensor types and tags

First-party clients can read sensor types and tags and filter by them:

```ts
const sensors = await client.datasources({
  category: 'ble',
  sensorType: 'ble-scanner', // Use an actual sensor_type from your inventory.
  tagIds: [7, 8], // Use tag IDs from your inventory, not tag names.
});
```

Filters combine with AND: a sensor must match the category, the exact
case-sensitive sensor type, and **all** selected tags. Omit a filter or pass
`tagIds: []` to leave that dimension unrestricted. Unknown types or IDs return
an empty list. Types allow up to 256 characters; tag lists allow up to 50 positive
safe integer IDs. Invalid SDK inputs reject with `RangeError`.

The HTTP parameters are `category`, `sensor_type`, and comma-separated `tag_ids`.
The gateway requires `datasources:read` and retains organisation, mandate and
credential checks. Non-first-party clients receive HTTP 403 for metadata filters;
their responses omit these metadata fields. Filters cannot grant access to
measurements or replace your application's citizen-publication rules.

Build filter choices from an unfiltered `client.datasources()` call in the
selected organisation/mandate context. Deduplicate tags by ID and types by value;
do not fetch a platform-wide taxonomy or infer labels from IDs. See the
[server-side picker example](server-credentials.md#sensor-filter-choices).

Migration note: custom transports should accept `DatasourceListOptions` and
implement its AND semantics, or reject unsupported filters instead of ignoring
them. Existing category-only calls and datasets remain valid. `DatasourceView`
and `DemoEntity` now allow optional `sensor_type` and `tags`; handle absent fields.
The SDK applies filters to HTTP results too, so older gateways cannot return a
broader SDK list by ignoring new parameters. Sensors without the requested
metadata do not match. Deploy gateway support before relying on direct HTTP
filters. These contract changes follow the SDK's major-release policy.

### Categories

Eleven categories exist. They matter because **data-read scopes are per category**
(see [Authentication](authentication.md#scopes)).

```
parking  noise  waste  garden  water  energy  weather  occupancy  ble  building  generic
```

The SDK exports them, plus the classifier the gateway uses:

```ts
import { CATEGORIES, classify } from '@datamatters-gmbh/urbanos-core';

classify({ name: 'Schallpegel Dom', streams: [{ name: 'LAeq', unit: 'dB' }] });
// → 'noise'
```

You rarely need `classify()` — the server sends the category. It exists so demo mode
classifies identically. Note `CATEGORIES` includes `'generic'`; you probably want to
exclude it from a filter UI.

### Legacy units and display conversions

The gateway and `DemoTransport` reproduce the legacy app's exact-name lookup.
They retain nonblank source units and fill blank units from the known stream-name
table, without device-profile checks. Unknown names retain an empty unit.

For returned measurement values, `pressure` and `pressure_hpa` multiply values
below 10,000 by 100; `uv` divides by 227. Other names remain unchanged. These
display conversions run once **after** aggregation, if requested, and regardless
of the source unit. This preserves legacy quirks: an explicit `hPa` label stays
unchanged even if the corresponding pressure number is multiplied by 100.
The rules reproduce display behavior; they do not validate units or calibrate
devices. The approximate UV scaling is not a verified UV index and must not
support health or sun-exposure advice.

**Migration:** remove client-side conversions for gateway responses and clear
cached metadata/readings on rollout. In particular, applying `uv / 227` twice
produces an incorrect value. `HttpTransport` does not convert responses again.
Supply original, unconverted samples and source units to demo datasets. The SDK
release includes a major changeset for these changed numeric semantics. Coordinate
the gateway deployment with consumers; there is no raw-value opt-out parameter.
Stored database/datacore samples remain unchanged.

## Timeseries

`client.timeseries(streamId)` returns a chainable builder. Nothing happens until
`.execute()`.

```ts
const result = await client
  .timeseries(21)
  .range({ last: '24h' })
  .aggregate('avg', { bucket: '1h', gapFill: 'last-value' })
  .execute();

// { streamId: 21, status: 200, points: [{ t: '2026-…Z', v: 57.2 }, …] }
```

### Choosing a range

```ts
.range({ last: '24h' })                     // relative
.range({ from: '2026-01-01T00:00:00Z',      // absolute (RFC3339 strings or Date)
         until: '2026-01-02T00:00:00Z' })
```

If you pass both, `from`/`until` win over `last`.

### Aggregating

```ts
.aggregate('avg', { bucket: '1h', gapFill: 'zero' })
```

- **Functions:** `avg`, `min`, `max`, `sum`
- **Gap fill:** `zero`, `last-value`, `linear-interpol`, or omit
- Omit `.aggregate()` for unaggregated samples. Values still include the
  [legacy display conversions](#legacy-units-and-display-conversions).

Buckets are aligned to the **UTC epoch**, and the result spans the bucket containing
your first sample through the one containing your last — it is **not** padded out to
your requested range. Empty buckets are filled, not dropped: with no `gapFill` (or
`'zero'`) they come back as `0` rather than being absent.

> ### The two duration formats are not the same
>
> This trips people up:
>
> | Where               | Accepts               | Rejects      |
> | ------------------- | --------------------- | ------------ |
> | `range({ last })`   | `30m` `24h` `7d` `2w` | `30s` `1.5h` |
> | `aggregate(bucket)` | `30s` `30m` `1h` `1d` | `1w` `1M`    |
>
> `last` supports weeks but not seconds; `bucket` supports seconds but not weeks.
> Both throw a plain `Error` on a bad value.

### Using the aggregation engine directly

```ts
import { aggregate, parseBucket } from '@datamatters-gmbh/urbanos-core';

const buckets = aggregate(samples, parseBucket('1h'), 'avg', 'zero');
```

Note `aggregate()` takes `Sample { t: Date; v: number }`, while the wire format
`SeriesPoint` uses `t: string`. Convert if you feed results back in.

## App storage

A small key/value store scoped to your app. Good for user preferences; not a
database.

```ts
await client.storage.put('prefs', { theme: 'dark' });

const prefs = (await client.storage.get('prefs')) as { theme: string } | undefined;
```

`get` returns `Promise<unknown>` — you cast. A missing key resolves to `undefined`,
it does not throw.

**Limits:** 10 keys per organisation, 16 KiB per value. Requires `storage:read` /
`storage:write`.

## Error handling

Two different failure modes, and mixing them up is the most common mistake.

### Request-level failures throw

```ts
import { AuthError, GatewayError } from '@datamatters-gmbh/urbanos-core';

try {
  await client.datasources();
} catch (e) {
  if (e instanceof AuthError) {
    await auth.beginAuthorization(); // token invalid/expired
  } else if (e instanceof GatewayError && e.status >= 500) {
    retryLater();
  }
}
```

| Class          | `code`             | Meaning                           |
| -------------- | ------------------ | --------------------------------- |
| `UrbanOSError` | `urbanos_error`    | Base class                        |
| `AuthError`    | `auth`             | Not authenticated / 401           |
| `ScopeError`   | `scope`            | Insufficient scope                |
| `TenantError`  | `tenant`           | Wrong element                     |
| `ConsentError` | `consent_required` | User consent needed               |
| `GatewayError` | `gateway`          | Other HTTP failure; has `.status` |
| `BridgeError`  | `bridge`           | Embed bridge failure              |

> Prefer branching on `.code` over `instanceof` if you might end up with two copies
> of the package in your tree — `instanceof` fails silently across duplicates.

### Per-query failures do not throw

**A timeseries query that fails comes back as a normal result with a non-200
`status`.** The HTTP request succeeded; that one stream didn't.

```ts
const result = await client.timeseries(999).range({ last: '1h' }).execute();

if (result.status !== 200) {
  console.warn(result.status, result.error); // 404 stream not found, 403 no scope
  return;
}
console.log(result.points);
```

`404` means the stream doesn't exist; `403` means it's in another element or you
lack `data:read:<category>` for it. **Always check `status` before reading
`points`** — a failed result has an empty `points` array, which otherwise looks like
"no data".

## Limits

| Limit                          | Value                       |
| ------------------------------ | --------------------------- |
| Queries per timeseries request | 50                          |
| Storage keys per organisation  | 10                          |
| Storage value size             | 16 KiB                      |
| Access token lifetime          | 15 minutes (auto-refreshed) |

There is no pagination and no maximum time range on timeseries queries today, and no
rate limiting on `/v1` — don't take that as licence to hammer it.
