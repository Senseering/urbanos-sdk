---
'@datamatters-gmbh/urbanos-core': major
---

Expose optional `ElementView.mandates` display metadata for server credentials.
Each entry contains an authorised mandate's `id` and `name`. Directory discovery
remains identifier-only. This major changeset follows the SDK's policy for
published Transport DTO changes.

Migration: existing `element()` calls and custom transports need no changes.
Handle a missing `mandates` field as an older gateway or user-token response;
an empty array means no authorised mandates. Resolve names using an
organisation-bound service client with `element:read`, not `/v1/me/mandates`,
which now rejects service credentials with HTTP 403. See the server-credentials
guide for named-picker examples and permission boundaries.
