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
  credential: {
    type: 'private_key_jwt',
    credentialId: process.env.URBANOS_SERVICE_CREDENTIAL_ID!,
    keyId: process.env.URBANOS_SERVICE_KEY_ID!,
    privateKey: process.env.URBANOS_SERVICE_PRIVATE_KEY!,
  },
  scopes: ['datasources:read', 'data:read:ble'],
});

for (const target of await service.listTargets()) {
  const city = service.forElement(target.elementId);
  const datasources = await city.datasources();
  // Fetch only what the server-side job needs.
}
```

`listTargets()` uses a five-minute directory token. It returns only element and
mandate IDs eligible for this app—not organization names and not data. Each
`forElement()` client obtains its own 15-minute organization-bound token. Token
requests are cached and coalesced per organization; a gateway `401` triggers one
renewal and one retry.

## Credential types

Organization and mandate credentials use a rotating shared secret:

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

Highly privileged first-party platform credentials use `private_key_jwt`. The
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

Shared-secret creation and rotation return plaintext once. Deploy the new secret
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
