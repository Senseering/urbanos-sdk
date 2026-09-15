# Server credentials

Use a server credential when an app backend must read authorized urbanOS data
without an urbanOS user login, including the first request. App users do not
need urbanOS accounts. An authorized administrator must approve the app's access
before the backend can use it.

The credential belongs to the app's existing client registration and shares its
per-organization storage namespace. Credential-specific restrictions can narrow
the app's access further.

## When is an urbanOS login needed?

| Who or what accesses the data?                                                               | Authentication                                                 |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| A person using the urbanOS dashboard or connecting an app with their own urbanOS permissions | Their urbanOS login                                            |
| An app backend with approved server access                                                   | Server credentials; no user login or redirect URI              |
| A city administrator using the app's own dashboard                                           | The app's admin login or city SSO; no urbanOS account required |
| A citizen viewing data the app has approved for publication                                  | No login required for that public view                         |

An authorized operator uses their urbanOS admin account to approve access during
onboarding. App users do not need to perform a one-time urbanOS login. The backend
obtains new short-lived tokens with its credential when needed.

### Public, confidential, and server credentials

Public clients handle user login in a browser or mobile app using PKCE, without a
client secret. Confidential clients handle that flow on a backend, which must also
authenticate with its client secret. "Public" describes the client, not whether
the data is public. Neither client type removes authorization requirements.

A confidential client's login secret does not replace user login. For login-free
access, provision a separate service credential and use `client_credentials`.
This flow has no browser redirect and requires no `redirect_uri` or user session.

**Current registration limitation:** the shell's app-client creation form still
requires a redirect URI for both client types. This is a registration UI
limitation, not a requirement of server token requests. A "server access only"
registration option without a redirect URI remains follow-up work. Do not invent
a callback URL or assume the confidential login secret is a service credential;
ask the platform operator to arrange the app registration and server access.

## Example: An admin dashboard and citizen app

This example shows an application with an admin dashboard and a public citizen app.

1. During onboarding, an authorized operator grants ExampleApp access to the
   city's permitted organization or mandate data and provisions a server credential.
2. City administrators use ExampleApp's own login or their city's SSO to select
   which sensors to publish. ExampleApp checks their role and city on its backend.
3. ExampleApp's backend fetches data with a city-bound service token. Citizens call
   ExampleApp's public API, which returns only approved sensors and public fields.

urbanOS controls what ExampleApp may access. ExampleApp must enforce what citizens
may see on every public request, including requests with changed sensor IDs.
Hiding a sensor in the interface is not access control. Unpublishing a sensor must
also invalidate public caches. Keep service credentials, gateway tokens, and
unpublished data out of the citizen app.

If enabled, app storage can hold publication settings in the app-and-organization
namespace. ExampleApp must restrict writes to authorized city admins; a service
credential does not authenticate those admins or provide public-data filtering.

## Server SDK setup

This entry point is for Node 22+ servers only:

```ts
import { UrbanOSServiceClient } from '@datamatters-gmbh/urbanos-core/server';

const service = new UrbanOSServiceClient({
  baseUrl: process.env.URBANOS_GATEWAY_URL!,
  apiKey: process.env.URBANOS_API_KEY!,
});

for (const target of await service.listTargets()) {
  const city = service.forElement(target.elementId);
  const datasources = await city.datasources();
  // Fetch only what the server-side job needs.
}
```

Create the key under **App clients → your app → Credentials → Create API key**.
Copy it once into `URBANOS_API_KEY` in your server's secret manager. No separate
client ID, secret, public key or redirect URI is needed for the server connection.
Use HTTPS; the SDK permits HTTP only for loopback development servers and rejects
token-endpoint redirects. Do not send this long-lived key to data endpoints or
to your app's browser. The SDK exchanges it for short-lived tokens.

For a single organisation, use `service.forElement(42)` with that organisation's
gateway ID; no directory call is needed. `listTargets()` is reserved for platform
keys, which a platform admin can create for first-party client registrations.
Choose **Selected organisations** or explicitly confirm **All organisations**
(including future organisations). An external app or server integration does not
need a shell listing or catalog entry. The key does not inherit global access
merely because its app client is first-party.

The optional **Only where a particular app is enabled** setting intersects that
organisation choice with current app enablement. Use it for your app's
app-participation policy. Existing app-restricted platform keys retain that
restriction. Without it, selected/all keys do not depend on catalog app enablement.

**Limit access to selected mandates** narrows the organisation choice to up to
500 mandates. Discovery returns only organisations with a selected, eligible
mandate, and only those mandate IDs. The key can read those mandates and their
organisation-level data; new or unselected mandates remain inaccessible. An app
restriction, if enabled, must also permit each selected mandate. Deleting the
last selected mandate removes access. Storage remains shared per app and
organisation, not per mandate.

Without mandate selection, keys keep their current/future-mandate behaviour.
Discovery returns only IDs, and each data token covers exactly one organisation.
The existing SDK supports both choices without additional configuration.

Use the gateway organisation ID displayed in urbanOS or returned by discovery,
not the internal organisation-management ID. To change a credential's target
boundary, provision a replacement credential and revoke the old one after
deployment; rotating its API key does not change that boundary.

Omit `scopes` to use the key's approved permissions. To narrow a particular server
job further, pass e.g. `scopes: ['datasources:read', 'data:read:ble']`. Omitting scopes
does not add storage or other permissions that the key lacks.

`listTargets()` uses a five-minute directory token. It returns only element and
mandate IDs eligible for this app—not organization names and not data. Each
`forElement()` client obtains its own 15-minute organization-bound token. Token
requests are cached and coalesced per organization and selected mandate; a gateway `401` triggers one
renewal and one retry.

### Choose a mandate inside your application

ExampleApp's superadmin can save an organisation and mandate in ExampleApp's own
server-side configuration. Use that choice with the same API key:

```ts
// Read settings saved through your backend's superadmin-only setup route.
const { elementId, mandateId } = appSettings;
const city = service.forElement(elementId, { mandateId });
const sensors = await city.datasources();
```

You do not need a new key or an urbanOS user login when changing this selection.
The key must already permit the chosen organisation and mandate. The gateway
checks mandate ownership and current permissions before issuing a token and on
subsequent requests. Tokens include the selected mandate; requests cannot switch
to another mandate by changing a sensor ID. Datasources owned by other mandates
remain excluded, including those marked shared or visible to all. Organisation-level
datasources remain available.

Omit the options to keep `service.forElement(elementId)`'s existing behaviour.
Separate clients have separate token caches for each organisation/mandate pair;
renewal preserves the selection. IDs must be positive safe integers. Platform
keys can use `listTargets()` to discover permitted mandate IDs. Single-organisation
keys can use IDs supplied during onboarding without directory access.

The optional mandate restriction when **creating a key** defines its maximum
permissions. This runtime choice narrows a request within those permissions.
ExampleApp must protect the setup route with its own superadmin authorization and
resolve the saved choice on its backend. Do not let citizens choose arbitrary
organisation or mandate IDs. Scope ExampleApp's data caches by both IDs and clear
published results when changing the configuration. App storage remains shared
per app and organisation, so namespace mandate-specific settings yourself.

Deploy a gateway supporting runtime `mandate_id` before using this SDK option.
The SDK rejects responses that omit or contradict the selected binding, including
responses from older gateways that ignore it. It does not retry with broader access.
For direct OAuth calls, add `mandate_id` alongside `element_id` to the
form-encoded `client_credentials` request. Directory requests do not accept a
mandate selection.

### Load mandate names for an administrator's picker

Directory discovery returns IDs. Resolve display names with a data token for
each permitted organisation:

```ts
const targets = await service.listTargets();
for (const target of targets) {
  const organisation = await service.forElement(target.elementId).element();
  if (organisation.mandates === undefined) {
    throw new Error('This gateway does not provide service mandate names yet');
  }
  const permitted = new Set(target.mandateIds);
  const choices = organisation.mandates.filter((mandate) => permitted.has(mandate.id));
  // Each choice has { id, name }. Show it only in your authorised admin UI.
}
```

The key needs `element:read`. Single-organisation keys can skip discovery and
read `service.forElement(elementId).element()` using their configured organisation.
A client created with `{ mandateId }` receives only that mandate's name. The
gateway checks current permissions and any signed mandate restrictions; names
do not grant membership or a user role. Do not call `/v1/me/mandates` with a server
credential: it requires a user session and returns HTTP 403.

Migration note: `ElementView.mandates` is optional. An absent field means an older
gateway or a user-token response; `[]` means no authorised mandates. Existing
`element()` calls and custom transports need no changes. Handle absence before
offering a named picker, and avoid guessing names from IDs. Deploy gateway support
before enabling the picker. This DTO change follows the SDK's major-release policy.

Keep names in your authorised setup interface. Avoid public caches or exposing
peer names in citizen views and benchmark responses.

### Sensor filter choices

For a first-party key with `datasources:read`, load metadata in the configured
organisation and mandate. Use it to populate ExampleApp's superadmin filters:

```ts
const city = service.forElement(elementId, { mandateId });
const inventory = await city.datasources();
const tags = [
  ...new Map(
    inventory.flatMap((sensor) => (sensor.tags ?? []).map((tag) => [tag.id, tag] as const)),
  ).values(),
];
const sensorTypes = [
  ...new Set(inventory.flatMap((sensor) => (sensor.sensor_type ? [sensor.sensor_type] : []))),
];

const filtered = await city.datasources({ sensorType: selectedType, tagIds: selectedTagIds });
```

Multiple selected tags require all tags to match. Sensor types use exact,
case-sensitive values; they are device types, not the broader data categories.
The gateway returns only metadata for permitted sensors. It excludes device
credentials and internal property IDs from service-token responses.

Protect this route with your app's superadmin authorization. Scope caches by
organisation, mandate and credential permissions; include filters in result-cache
keys and refresh choices after configuration changes. Treat tag names as display
text, not HTML. Apply ExampleApp's publication rules on the server before returning
anything to citizens: these filters narrow a query, not the API key's permissions.
Keep the key and peer inventories out of browser code. See
[filter semantics and migration notes](querying-data.md#sensor-types-and-tags).

## Advanced credential types (optional)

The one-copy API key packages the credential ID and random secret together. The
gateway checks the secret's SHA-256 hash; urbanOS never stores the plaintext key.
It supports organisation, mandate and first-party platform access, with the same
scope and tenant checks. A stolen key can authenticate until expiry or revocation,
so keep it server-side. This convenience option replaces the earlier requirement
that all platform credentials use asymmetric authentication.

Existing separate shared-secret credentials remain supported:

```ts
const service = new UrbanOSServiceClient({
  baseUrl: process.env.URBANOS_GATEWAY_URL!,
  credential: {
    type: 'shared_secret',
    credentialId: process.env.URBANOS_SERVICE_CREDENTIAL_ID!,
    clientSecret: process.env.URBANOS_SERVICE_CLIENT_SECRET!,
  },
  scopes: ['datasources:read', 'data:read:weather', 'storage:read'],
});
```

First-party platform credentials can still use `private_key_jwt` as an advanced option. The
app holds the private ES256 key; urbanOS stores only the public JWK. Assertions
use the exact token endpoint as their audience, expire after two minutes, and
carry a unique replay-protected `jti`. Set `tokenEndpointAudience` only when the
public OAuth endpoint differs from `baseUrl + /oauth/token`.

Asymmetric client authentication follows the recommendations in the
[OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/rfc9700).

## Storage

Credential storage is disabled by default. An organization admin or platform
admin may activate `read` or `read_write`; these map to `storage:read` and
`storage:write`. Machine and logged-in clients for the same app and organization
share the existing namespace:

```ts
const city = service.forElement(42);
const preferences = await city.storage.get('preferences');
await city.storage.put('preferences', { benchmarkEnabled: true });
```

`storage:write` writes only app-owned key/value storage and collections. It
never permits sensor, datasource, timeseries, or platform mutations. The current
limits remain 10 key/value entries per app and organization, 16 KiB per value,
and 1,000 16-KiB items per collection.

## Secret handling

Put credentials in a deployment secret manager and inject them only into the
server process. Never put them in:

- `NUXT_PUBLIC_*`, `NEXT_PUBLIC_*`, `VITE_*`, or any browser-visible runtime config;
- client bundles, HTML, source control, container images, or build logs;
- analytics events, error payloads, session replay, or request logging.

The `/server` constructor rejects browser use at runtime. That is a last guard,
not a substitute for keeping the import out of client code.

API-key creation and replacement return plaintext once. **Replace API key** keeps
the same app identity and storage namespace. Update `URBANOS_API_KEY` on the server
and restart/recreate the service client. The previous secret expires after a
24-hour overlap. Revoke the credential immediately if a key is compromised; this
invalidates all its keys and already-issued tokens, rather than waiting for rotation.

Legacy shared-secret creation and rotation also return plaintext once. Deploy the new secret
during the 24-hour overlap, verify it, then remove the old secret. For ES256,
register the new public JWK, deploy the matching private key, verify token minting,
then let the previous public key expire. Revocation and policy narrowing are
checked on every gateway request, so an outstanding token stops working immediately.

## Privacy boundary

A server credential provides login-free authentication, organization authorization,
and target discovery for gateway-backed data. It does not make cross-organization
comparison anonymous by itself. Do not persist peer telemetry or raw benchmark
inputs in app storage without a separate privacy review. A benchmark feature must
define a minimum cohort and suppression rules and return only aggregates to the
logged-in organization.
