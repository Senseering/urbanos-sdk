# @senseering/urbanos-cli

The planned `urbanos` CLI: mock gateway, host simulator, manifest validate/publish.

> **Not implemented yet.** This package publishes so the build pipeline is exercised
> end to end, but it exports only a version constant and **registers no commands** —
> running `urbanos` does nothing.

## What to use instead

**Validating a manifest:**

```ts
import { validateAppManifest } from '@senseering/urbanos-manifest';

const result = validateAppManifest(JSON.parse(raw));
if (!result.ok) {
  console.error(result.errors);
  process.exit(1);
}
```

**Running without a gateway:** use `DemoTransport` from
`@senseering/urbanos-core` — see [demo mode](../../docs/demo-mode.md).

**Testing the embed bridge:** `linkedChannels()` from
`@senseering/urbanos-bridge` gives you a connected host/app pair in-process, no
iframe needed — see [embedding](../../docs/embedding.md#protocol-reference).

## Docs

[Documentation index](../../docs/README.md)
