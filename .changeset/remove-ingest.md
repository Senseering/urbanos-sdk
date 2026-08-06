---
'@senseering/urbanos-core': minor
---

**Breaking:** remove `ingest()` and the `IngestPoint` type.

The SDK is read-only over platform data and always has been. `HttpTransport.ingest()`
POSTed to `/v1/timeseries/ingest`, an endpoint the gateway does not expose, and no
scope can authorise a timeseries write — `data:write:*` is ungrantable at every
client tier, enforced both in the gateway's scope ceiling and by a database
constraint. The method could only ever fail against a real gateway. Against
`DemoTransport` it "succeeded" by counting points and discarding them, which made it
look functional in demo mode and fail in production — the worst possible shape for an
API.

Removed from `Transport`, `UrbanOSClient`, `HttpTransport`, and `DemoTransport`,
along with the now-unused `IngestPoint` export.

**Migration:** there is no replacement. Sensor data enters the platform through the
ingest pipeline, not through app clients. An app's only write surface is
`putStorage` / `client.storage.put()`. If you call `client.ingest()` today, it is
already failing against the gateway — delete the call.

Note this is a `minor` bump rather than `major` because core is pre-1.0, where
semver puts breaking changes in the minor slot; `0.1.x → 0.2.0` signals the break
without declaring 1.0 API stability.
