---
'@datamatters-gmbh/urbanos-core': major
---

Add typed sensor metadata and datasource filters for first-party clients.
`DatasourceView` and `DemoEntity` accept optional `sensor_type` and `tags`.
`DatasourceListOptions` adds exact `sensorType` and all-of `tagIds` filters to
`UrbanOSClient`, `HttpTransport` and `DemoTransport`.

Migration: custom transports must implement the new filter semantics or reject
unsupported filters. Existing category-only calls remain valid. Handle absent
metadata and build filter choices from the authorised inventory. See
`docs/querying-data.md` for limits and gateway rollout requirements.
