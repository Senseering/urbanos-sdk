---
'@datamatters-gmbh/urbanos-core': minor
---

Add `service.forElement(elementId, { mandateId })` for backend applications that
choose a mandate with an existing server credential. Cache tokens per
organisation and mandate, preserve the selection during renewal, and reject
gateway responses that do not confirm the requested binding. Existing calls
without a mandate retain their behaviour.
