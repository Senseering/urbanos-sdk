# Publishing to the store

What your app needs to declare before it can be listed.

> **Where things stand today:** the manifest is the declared format and validating
> against it is worth doing now — it's what the consent screen and store listing are
> built around. But the pipeline that ingests it is not automated yet: listing an app
> currently goes through us. Write the manifest, then **email mail@datamatters.io**.
> We'd rather tell you that than let you build against a pipeline that isn't there.

- [The manifest](#the-manifest)
- [Field reference](#field-reference)
- [Validating](#validating)
- [Checklist](#checklist)

## The manifest

One declarative file describing your app: what it's called, who made it, what
permissions it needs and why, how it embeds, and whether it offers a demo.

```ts
// urbanos.app.ts
import { defineAppManifest } from '@datamatters-gmbh/urbanos-manifest';

export default defineAppManifest({
  manifestVersion: 1,
  id: 'io.acme.air-quality',
  version: '1.2.0',

  name: { de: 'Luftqualität', en: 'Air Quality' },
  description: {
    de: 'Feinstaub und NO₂ live im Stadtgebiet.',
    en: 'Live particulate matter and NO₂ across the city.',
  },

  developer: {
    name: 'Acme GmbH',
    url: 'https://acme.example',
    supportEmail: 'support@acme.example',
  },

  icons: { svg: './assets/icon.svg', png512: './assets/icon-512.png' },
  categories: ['environment', 'analytics'],

  embed: {
    protocol: 2,
    hostOrigins: ['https://urbanos.udp.city'],
    modes: ['app', 'card'],
  },

  scopes: {
    required: [
      {
        scope: 'datasources:read',
        reason: { de: 'Sensoren auflisten', en: 'List available sensors' },
      },
      {
        scope: 'data:read:weather',
        reason: { de: 'Messwerte anzeigen', en: 'Display measurements' },
      },
    ],
    optional: [
      {
        scope: 'storage:write',
        reason: { de: 'Filter speichern', en: 'Remember your filters' },
      },
    ],
  },

  screens: [
    { id: 'overview', path: '/', title: { de: 'Übersicht', en: 'Overview' } },
    { id: 'station', path: '/station/:id', title: { de: 'Messstation', en: 'Station' } },
  ],

  demo: { available: true, entryPath: '/?demo=true' },
  locales: ['de', 'en'],
  minSdkVersion: '0.1.0',
});
```

## Field reference

### Required

| Field               | Type               | Notes                                                                                                                     |
| ------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `manifestVersion`   | `1`                | Exactly `1`                                                                                                               |
| `id`                | string             | Reverse-DNS, e.g. `io.acme.air-quality`. Must contain a dot; lowercase alphanumeric first label, later labels may use `-` |
| `version`           | string             | Your app version. Not validated — use semver anyway                                                                       |
| `name`              | `{ locale: text }` | Localized display name                                                                                                    |
| `developer.name`    | string             | Publisher name shown to users                                                                                             |
| `embed.protocol`    | `2`                | Exactly `2`                                                                                                               |
| `embed.hostOrigins` | `string[]`         | Origins allowed to embed you. **No default — required**                                                                   |
| `scopes`            | object             | The object itself is required; `scopes: {}` is valid                                                                      |

> `id` is your **store** identifier. It is not your OAuth `clientId` (`uos_c_…`).
> Two different things, registered separately.

### Optional

| Field                    | Type                    | Default   | Notes                            |
| ------------------------ | ----------------------- | --------- | -------------------------------- |
| `description`            | `{ locale: text }`      | —         | Store description                |
| `developer.url`          | string (URL)            | —         | Validated as a URL               |
| `developer.supportEmail` | string (email)          | —         | Validated as an email            |
| `icons.svg`              | string                  | —         | Path or URL                      |
| `icons.png512`           | string                  | —         | 512×512                          |
| `categories`             | `string[]`              | `[]`      | Free-form store categories       |
| `embed.modes`            | `('app'\|'card')[]`     | `['app']` | Surfaces you render in           |
| `scopes.required`        | `ScopeRequest[]`        | `[]`      | Cannot work without these        |
| `scopes.optional`        | `ScopeRequest[]`        | `[]`      | User may decline                 |
| `sensorTypes.required`   | `string[]`              | `[]`      | Needed for install               |
| `sensorTypes.optional`   | `string[]`              | `[]`      | Unlock extra features            |
| `screens`                | `Screen[]`              | `[]`      | Deep-linkable routes             |
| `settings`               | anything                | —         | Free-form; not validated         |
| `ai.prompts`             | `{id, schemaVersion}[]` | —         | Required if `ai` is present      |
| `pricing.model`          | string                  | —         | Required if `pricing` is present |
| `pricing.monthlyFrom`    | number                  | —         | Starting monthly price           |
| `pricing.currency`       | string                  | —         | e.g. `EUR`                       |
| `demo.available`         | boolean                 | —         | Required if `demo` is present    |
| `demo.entryPath`         | string                  | —         | Where the demo starts            |
| `locales`                | `string[]`              | `['de']`  | Locales you ship                 |
| `minSdkVersion`          | string                  | —         | Minimum SDK version              |

### Scopes and reasons

Each scope carries a **localized reason shown on the consent screen**. This is the
sentence that decides whether a user trusts your app — write it for them, not for
your changelog.

```ts
{ scope: 'data:read:weather', reason: { de: 'Messwerte anzeigen', en: 'Display measurements' } }
```

Use the real scope strings from
[Authentication](authentication.md#scopes) — the manifest accepts any string, so a
typo here surfaces only at runtime as a permission failure.

Put in `required` only what your app genuinely cannot run without. Everything else
goes in `optional`; a user declining an optional scope should degrade a feature, not
break the app.

> Remember the **unverified-client cap of three `data:read:<category>` scopes**.
> Declaring six in your manifest doesn't lift it — get the client verified.

### Screens

```ts
screens: [
  { id: 'overview', path: '/', title: { de: 'Übersicht', en: 'Overview' } },
  { id: 'station', path: '/station/:id', title: { de: 'Messstation', en: 'Station' } },
];
```

Screens let the host deep-link into your app; the paths arrive via
`bridge.onNavigate` (see [Embedding](embedding.md#listening-to-the-host)).

### Demo

```ts
demo: { available: true, entryPath: '/?demo=true' }
```

Declaring a demo is strongly recommended — it's how someone evaluates your app
without signing in or installing anything. Your demo must hold no credential and
reach no real data; the host enforces this by refusing to mint a token in demo mode.
See [Demo mode](demo-mode.md).

## Validating

`defineAppManifest()` validates at author time and **throws** on invalid input, which
is what you want in a build:

```ts
import { defineAppManifest } from '@datamatters-gmbh/urbanos-manifest';

export default defineAppManifest({/* … */}); // throws ZodError if wrong
```

For structured errors instead of a throw:

```ts
import { validateAppManifest } from '@datamatters-gmbh/urbanos-manifest';

const result = validateAppManifest(JSON.parse(raw));

if (!result.ok) {
  console.error(result.errors); // ['id: id must be reverse-DNS, e.g. io.acme.air-quality']
  process.exit(1);
}
```

A one-line check worth adding to CI:

```bash
node --input-type=module -e "import('./urbanos.app.ts').then(() => console.log('manifest ok'))"
```

> The `urbanos` CLI does **not** implement a `manifest validate` command yet, despite
> the package existing. Use `validateAppManifest()`.

## Checklist

Before you get in touch:

**Manifest**

- [ ] `defineAppManifest()` runs without throwing
- [ ] `id` is reverse-DNS and one you'll keep — it identifies your app permanently
- [ ] `name` and `description` provided for every locale in `locales`
- [ ] Every scope has a reason a non-technical user would understand
- [ ] `required` holds only genuinely required scopes
- [ ] `hostOrigins` lists the shell origin
- [ ] Icons exist at the declared paths

**App**

- [ ] Demo mode works with no network and no token
- [ ] Handles `loading`, `ready`, `empty`, and `error` states
- [ ] Respects `theme` and `locale` from the bridge context
- [ ] Re-renders on `onContextChanged` (organisation switches!)
- [ ] Checks `status` on every timeseries result, not just `points`
- [ ] Handles `AuthError` and token revocation
- [ ] Degrades sensibly when an optional scope is declined

**Registration** (see [Authentication](authentication.md#before-you-write-any-code))

- [ ] Organisation approved as a developer
- [ ] Client registered; `clientId` in hand
- [ ] Redirect URIs registered — exact strings, no trailing-slash drift
- [ ] Browser origins registered for CORS (production _and_ dev)
- [ ] Client submitted for verification if you need more than three data categories

Then **email mail@datamatters.io** with your manifest and deployed URL.
