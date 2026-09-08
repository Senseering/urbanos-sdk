# urbanOS SDK documentation

Everything you need to build an app on urbanOS — fetch sensor data, authenticate,
embed in the urbanOS shell, and publish to the store.

## Start here

**[Getting started](getting-started.md)** — install the packages and get a working
app in about five minutes. **No credentials required**: demo mode runs entirely
offline, so you can build and test the whole app before you have platform access.

## Guides

| Guide                                       | Read it when                                                |
| ------------------------------------------- | ----------------------------------------------------------- |
| [Getting started](getting-started.md)       | First time here. Install → demo app → live data.            |
| [Querying data](querying-data.md)           | You want elements, datasources, timeseries, or app storage. |
| [Authentication](authentication.md)         | You need real data: client registration, scopes, tokens.    |
| [Server credentials](server-credentials.md) | A backend needs login-free, organization-bound access.      |
| [Demo mode](demo-mode.md)                   | You're building the offline dataset your app ships with.    |
| [Embedding](embedding.md)                   | Your app runs inside the urbanOS shell in an iframe.        |
| [Publishing](publishing.md)                 | You're ready to list your app in the store.                 |
| [API reference](api-reference.md)           | You want the full list of exports.                          |

## The one idea worth knowing up front

Everything goes through a **`Transport`**. Your app code never changes between
demo and production — you swap the transport and nothing else:

```ts
const transport = isDemo
  ? new DemoTransport(myDataset) // offline, deterministic
  : new HttpTransport({ baseUrl, tokens }); // live gateway

const client = new UrbanOSClient(transport); // identical from here on
```

Demo mode runs the _same_ aggregation and classification engines as the live
gateway, pinned by shared conformance vectors. A chart that looks right in demo
looks right in production.

## Packages at a glance

| Package                                | Status   | What it gives you                           |
| -------------------------------------- | -------- | ------------------------------------------- |
| `@datamatters-gmbh/urbanos-core`       | stable   | The client, transports, auth, query builder |
| `@datamatters-gmbh/urbanos-bridge`     | stable   | Embed protocol v2 (iframe host ↔ app)       |
| `@datamatters-gmbh/urbanos-demo`       | usable   | Seeded generators for demo datasets         |
| `@datamatters-gmbh/urbanos-manifest`   | usable   | App manifest schema + validation            |
| `@datamatters-gmbh/urbanos-vue`        | usable   | Vue 3 plugin + composables                  |
| `@datamatters-gmbh/urbanos-nuxt`       | skeleton | Not implemented yet                         |
| `@datamatters-gmbh/urbanos-tokens`     | skeleton | Not implemented yet                         |
| `@datamatters-gmbh/urbanos-cli`        | skeleton | Not implemented yet — no commands           |
| `@datamatters-gmbh/create-urbanos-app` | skeleton | Not implemented yet — no templates          |

We flag skeletons honestly so you don't build a plan around something that isn't
there. See [API reference](api-reference.md) for exactly what each package exports.

## Getting help

- Bugs and feature requests: open an issue on this repo.
- Platform access, client registration, store listings: **mail@datamatters.io**
- Security reports: **mail@datamatters.io** (see [SECURITY.md](../SECURITY.md))
