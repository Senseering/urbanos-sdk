# Security Policy

## Reporting a vulnerability

Email **mail@datamatters.io** with details and, if possible, a reproduction. Please do
**not** open a public issue for security reports.

We follow **90-day coordinated disclosure**: we acknowledge within 3 business days, agree a
remediation timeline, and credit reporters who wish to be named.

## In scope

This SDK sits on the trust boundary of the urbanOS platform. The following are explicitly
in scope and reviewed with extra care:

- **The embed bridge** (`@senseering/urbanos-bridge`): message validation, origin checks,
  the `MessageChannel` handshake, and anything touching how a host and a guest app exchange
  data.
- **Token handling** (`@senseering/urbanos-core` auth): how scoped app tokens are stored,
  refreshed, and never leaked; ensuring the user session never crosses the bridge.
- **The manifest schema** (`@senseering/urbanos-manifest`): scope/permission declarations
  that drive consent.

## Out of scope

- The urbanOS gateway and the platform services behind it. Report those to the same
  address — they are maintained separately from this SDK.
- Third-party apps built with the SDK.
