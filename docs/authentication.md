# Authentication

How your app gets a token and keeps it fresh.

- [Two modes](#two-modes)
- [Before you write any code](#before-you-write-any-code)
- [Scopes](#scopes)
- [Standalone apps (PKCE)](#standalone-apps-pkce)
- [Embedded apps](#embedded-apps)
- [Background services](#background-services)
- [Tokens and refresh](#tokens-and-refresh)
- [Troubleshooting](#troubleshooting)

## Two modes

| Mode           | Where your app runs               | Token provider      |
| -------------- | --------------------------------- | ------------------- |
| **Standalone** | Its own domain, user signs in     | `PkceTokenProvider` |
| **Embedded**   | In an iframe inside urbanOS shell | `HostTokenProvider` |

Both implement the same `TokenProvider` interface, so `HttpTransport` doesn't care
which one you hand it. You can support both from one codebase.

## Background services

A backend that must run without an interactive login uses a server credential
attached to the same app-client registration. This also covers backends serving
citizen apps, not just scheduled jobs. App users need no urbanOS account, even
for first-time setup; an authorized operator grants the app access during onboarding.

Server token requests use `client_credentials`, with no user session, PKCE, or
redirect URI. A confidential client's user-login secret alone does not enable this
flow. See [Server credentials](server-credentials.md) for the ExampleApp example,
the current registration UI limitation, provisioning, and secret handling.

## Before you write any code

The checklist below covers browser-based user-login integrations. For server-only
access, follow [Server credentials](server-credentials.md); the redirect and
browser CORS requirements below do not apply to backend token requests.

### 1. Your organisation is approved as a developer

App clients can only be created by organisations that have been enabled for
development. That's a platform-admin action.

**Email mail@datamatters.io** to get your organisation approved.

### 2. You have a registered client

Once approved, an admin of your organisation registers the app in the urbanOS shell
under **Settings → Organization → App clients**. You get back a client id shaped like
`uos_c_abc123…`.

At registration you set:

| Field            | Notes                                                    |
| ---------------- | -------------------------------------------------------- |
| **Name**         | Shown on the consent screen                              |
| **Client type**  | `public` for browser apps (**immutable after creation**) |
| **Redirect URI** | Where the user lands after consent                       |
| **Scopes**       | What the app may request                                 |

> The client id is **not** your manifest id. `uos_c_…` is the OAuth client;
> `io.acme.air-quality` is the store identifier. They're different things.

### 3. Your redirect URI matches exactly

**The gateway compares redirect URIs with plain string equality.** No prefix
matching, no wildcards, no normalisation.

`https://app.example.com/callback` and `https://app.example.com/callback/` are
different URIs. A trailing slash breaks the flow.

Rules: `https` always; `http` only for `localhost`, `127.0.0.1`, `[::1]`; no `*`; no
fragment; max 2048 chars. Custom schemes are allowed only for `public` clients.

### 4. Your origin is allowlisted for CORS

The gateway derives its CORS allowlist from your client's **redirect URIs** —
the origin of each one is allowed automatically. There is no separate origins
field to fill in: register `https://app.example.com/callback` as a redirect URI
and `https://app.example.com` may call the gateway.

It **echoes only exact matches — never `*`**. A blocked preflight is a bare 204
with no CORS headers, which the browser reports as an opaque network error, so
an origin that is not on the list looks like the gateway being down rather than
like a configuration problem. If you see that, check the origin of your
registered redirect URIs first.

Only `http`/`https` redirect URIs yield an origin. A custom-scheme mobile
redirect (`myapp://callback`) has no browser origin and does not need one.

Register `https://app.example.com` **and** your dev origin (e.g.
`http://localhost:5173`).

Note the gateway does **not** send `Access-Control-Allow-Credentials`. Auth is
bearer-token only; cookies are never used.

### And one more: the app must be installed

A registered client still needs to be **installed into each organisation** whose data
it reads. Until then authorization returns `403 app_not_installed`. An org admin
does this from the consent screen or the app store — the consent screen shows an
Install button when the admin viewing it has the rights.

## Scopes

Request the narrowest set that makes your app work. The user sees them on the consent
screen with the reasons from your [manifest](publishing.md).

### Available scopes

| Scope                  | Grants                                |
| ---------------------- | ------------------------------------- |
| `profile:read`         | The user's name and email             |
| `element:read`         | The organisation's name and base data |
| `datasources:read`     | The list of datasources and streams   |
| `data:read:<category>` | Measurements for one category         |
| `storage:read`         | Read your app's own storage           |
| `storage:write`        | Write your app's own storage          |

`<category>` is one of the eleven: `parking`, `noise`, `waste`, `garden`, `water`,
`energy`, `weather`, `occupancy`, `ble`, `building`, `generic`.

A typical read-only app:

```ts
scopes: ['profile:read', 'element:read', 'datasources:read', 'data:read:noise'];
```

### What you cannot have

- **`data:read:*`** (all categories) is **first-party only**. Third-party apps must
  name each category.
- **`data:write:*`**, **`streams:manage`**, **`webhooks:manage`** are ungrantable at
  every tier, including first-party. Apps are read-only over platform data; your only
  write surface is `storage:write`.

### The unverified-client cap

> An **unverified** client may hold at most **three** `data:read:<category>` scopes.
> Extra ones are dropped **silently** at token-mint time, and the survivors are the
> alphabetically first three.
>
> So requesting `data:read:water`, `data:read:noise`, `data:read:parking`,
> `data:read:energy` leaves you with `energy`, `noise`, `parking` — and `water`
> quietly fails at query time with a `403` on those results.

Submit your client for verification (from its detail page in the shell) to lift the
cap. Effective scopes are always
`requested ∩ client's allowed ∩ install grant ∩ tier ceiling` — so a scope can also
disappear because an admin narrowed the install.

## Standalone apps (PKCE)

Your app runs on its own domain. The user is sent to the urbanOS shell to sign in and
consent, then back to you with a code you exchange for a token.

```
your app  →  shell /oauth/authorize  →  (user consents)  →  your /callback?code=…
your app  →  gateway POST /oauth/token {code, code_verifier}  →  tokens
```

The consent screen lives on the shell, not on the gateway, because the exchange needs
the user's platform session — which a third party must never see.

### Setup

```ts
import { PkceTokenProvider } from '@datamatters-gmbh/urbanos-core';

const auth = new PkceTokenProvider({
  gatewayUrl: 'https://urbanos-gateway.udp.city',
  shellUrl: 'https://urbanos.udp.city',
  clientId: 'uos_c_abc123',
  redirectUri: 'https://app.example.com/callback', // exact match, absolute URL
  scopes: ['profile:read', 'element:read', 'datasources:read', 'data:read:noise'],
  // elementId: 42,   // omit to let the user pick their organisation
});
```

| Option                | Default    | Notes                                        |
| --------------------- | ---------- | -------------------------------------------- |
| `gatewayUrl`          | required   | No trailing slash                            |
| `shellUrl`            | required   | Hosts the consent screen                     |
| `clientId`            | required   | `uos_c_…`                                    |
| `redirectUri`         | required   | Absolute; must start `http://` or `https://` |
| `scopes`              | `[]`       | See above                                    |
| `elementId`           | —          | Omit → the shell shows an org picker         |
| `expirySkewMs`        | `60_000`   | Refresh this early                           |
| `refreshTokenStorage` | `'memory'` | Or pass a `Storage` to persist               |

### Wiring it up

```ts
import { AuthError, HttpTransport, UrbanOSClient } from '@datamatters-gmbh/urbanos-core';

// At boot: returns null when this isn't the callback URL, so call it unconditionally.
await auth.completeAuthorization();

if (!auth.isAuthenticated()) {
  await auth.beginAuthorization(); // navigates away; never resolves
}

const client = new UrbanOSClient(
  new HttpTransport({ baseUrl: 'https://urbanos-gateway.udp.city', tokens: auth }),
);
```

**`getToken()` never redirects.** It throws `AuthError` when there's no usable token.
That's deliberate — a redirect hidden inside a data call would be impossible to
reason about. Handle it where it makes sense for your UI:

```ts
try {
  const datasources = await client.datasources();
} catch (e) {
  if (e instanceof AuthError) await auth.beginAuthorization();
  else throw e;
}
```

| Method                    | Does                                                    |
| ------------------------- | ------------------------------------------------------- |
| `beginAuthorization()`    | Navigates to the consent screen. **Never resolves.**    |
| `completeAuthorization()` | Handles the callback. Returns `null` if not a callback. |
| `isAuthenticated()`       | Cached token or refresh token present                   |
| `getToken()`              | Current token; throws `AuthError` if unauthenticated    |
| `refresh()`               | Force a refresh                                         |
| `logout()`                | Clears local tokens (no server-side revocation)         |

`completeAuthorization()` is safe to call twice — it consumes the stored transaction
before its first `await`, so a React StrictMode double-mount won't break it. It also
strips `code`, `state`, and friends from the URL afterwards, leaving your own query
params intact.

### Where tokens are stored

- **PKCE transaction** → `sessionStorage`, valid 10 minutes. Concurrent flows are
  stored separately, keyed by `state`, so a second tab or a retried sign-in does not
  invalidate one already in flight. Up to 10 are kept; expired ones are pruned.
- **Access token** → memory only, always.
- **Refresh token** → memory by default.

> Passing `refreshTokenStorage: localStorage` keeps users signed in across reloads,
> at the cost of exposing the refresh token to any XSS on your origin. The default is
> memory for that reason. Choose deliberately.

### Server-side rendering

Constructing `PkceTokenProvider` during SSR is safe — the browser dependencies
resolve lazily. _Using_ it is not. Gate the auth calls behind a client-side check.

## Embedded apps

When the shell hosts your app in an iframe, it mints tokens for you. You never run a
consent flow.

```ts
import { connectApp, windowChannel } from '@datamatters-gmbh/urbanos-bridge';
import { HostTokenProvider, HttpTransport, UrbanOSClient } from '@datamatters-gmbh/urbanos-core';

const bridge = await connectApp(
  windowChannel({ target: window.parent, targetOrigin: 'https://urbanos.udp.city' }),
);

const client = new UrbanOSClient(
  new HttpTransport({
    baseUrl: 'https://urbanos-gateway.udp.city',
    tokens: new HostTokenProvider(bridge),
  }),
);

bridge.signalReady();
```

`HostTokenProvider` caches, coalesces concurrent refreshes, and listens for
revocation — after which `getToken()` throws `AuthError` until a fresh token arrives.
Call `close()` when tearing down.

`AppBridge` satisfies `HostTokenSource` structurally; core never imports the bridge
package.

> **In demo mode the host refuses to mint a token at all.** A demo app must hold no
> credential and reach no real data. See [Embedding](embedding.md).

Full protocol details: **[Embedding](embedding.md)**.

## Mandates (tenant scoping)

A **mandate** is a sub-tenant within an element (organisation) — a grouping of
datasources with its own members. Datasources can be scoped to a mandate; the
gateway then only returns them to a token **bound to that mandate** (the `mid`
claim). There is **no bypass**: a third-party token with no mandate (`mid=0`,
instance level) simply does not see mandate-scoped data. The `mid` claim is only
ever minted from a mandate the user proved membership in (or is an element admin
of), so naming a mandate you have no access to is denied, never silently granted.

**Your app must select the active mandate — in both modes.**

**Embedded:** the host bakes the shell's active mandate into the token it mints,
and delivers it in the bridge context. When the user switches mandate in the
shell, the host emits `CONTEXT_CHANGED` with the new `mandate.id` — re-read your
data for the new tenant (a full reload is the safe default). Nothing else to do;
the token is already bound.

**Standalone (PKCE):** login yields an instance-level token (`mid=0`). Bind a
mandate explicitly, then switch with the same call:

```ts
// After completeAuthorization(), pick the user's mandate (e.g. from /v1/me) and bind it.
await auth.setActiveMandate(mandateId); // re-mints a token bound to `mandateId`
auth.activeMandate(); // → mandateId

// Switching tenant is another call; instance level is `null`.
await auth.setActiveMandate(otherMandateId);
await auth.setActiveMandate(null); // back to instance level
```

`setActiveMandate()` requires a completed login (it re-mints through the refresh
grant) and throws `AuthError` if the gateway denies the mandate. The binding
rides along on every silent refresh afterwards, so you set it once per tenant
selection, not per request.

## Tokens and refresh

| Thing              | Lifetime   |
| ------------------ | ---------- |
| Access token       | 15 minutes |
| Refresh token      | 30 days    |
| Authorization code | 10 minutes |

Refresh is handled for you. `HttpTransport` retries **once** on a 401 after calling
`tokens.refresh()`, and skips the retry if the new token is identical to the old one.
Opt out with `retryOnUnauthorized: false`.

Two behaviours worth knowing:

- **Refresh tokens rotate, and reuse is fatal.** Each refresh returns a new token and
  invalidates the old one. Replaying a spent refresh token revokes the entire chain —
  a deliberate stolen-token defence. Don't cache refresh tokens in two places.
- **Scopes are re-evaluated on every refresh.** If an admin narrows your install, your
  scopes shrink mid-session. Handle `403` on data reads even after a successful start.

Treat the access token as **opaque**. It's a JWT, but `expiresAt` and `element_id`
are returned alongside it precisely so you never have to parse it.

### Static tokens (tests, scripts)

```ts
import { StaticTokenProvider } from '@datamatters-gmbh/urbanos-core';

const tokens = new StaticTokenProvider({
  accessToken: 'tok',
  expiresAt: Date.now() + 60_000,
  scopes: ['element:read'],
  tenantId: 42,
});
```

`refresh()` is a no-op. Fine for tests; useless in a browser.

## Troubleshooting

| Symptom                                  | Cause                                                                 |
| ---------------------------------------- | --------------------------------------------------------------------- |
| CORS error before any request            | No registered redirect URI has your app's origin                      |
| `403 app_not_installed`                  | The app isn't installed in that organisation                          |
| Consent screen shows a redirect mismatch | `redirectUri` differs byte-for-byte from the registered one           |
| `AuthError` on every call                | `completeAuthorization()` never ran, or the user isn't signed in      |
| Some streams return `403`, others fine   | Missing `data:read:<category>`, or the unverified 3-scope cap         |
| Scopes shrank without a redeploy         | An admin narrowed the install; scopes re-evaluate on refresh          |
| `TenantError` after login                | The returned token is bound to a different element than `elementId`   |
| Auth works nowhere against a deployment  | The consent screen is feature-flagged per environment — check with us |

Still stuck? **mail@datamatters.io**.
