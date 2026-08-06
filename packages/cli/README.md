# @datamatters-gmbh/urbanos-cli

The planned `urbanos` CLI: mock gateway, host simulator, manifest validate/publish.

> **Not implemented yet.** This package publishes so the build pipeline is exercised
> end to end, but it exports only a version constant and **registers no commands** —
> running `urbanos` does nothing.

## What to use instead

**Validating a manifest:**

```ts
import { validateAppManifest } from '@datamatters-gmbh/urbanos-manifest';

const result = validateAppManifest(JSON.parse(raw));
if (!result.ok) {
  console.error(result.errors);
  process.exit(1);
}
```

**Running without a gateway:** use `DemoTransport` from
`@datamatters-gmbh/urbanos-core` — see [demo mode](https://github.com/Senseering/urbanos-sdk/blob/main/docs/demo-mode.md).

**Testing the embed bridge:** `linkedChannels()` from
`@datamatters-gmbh/urbanos-bridge` gives you a connected host/app pair in-process, no
iframe needed — see [embedding](https://github.com/Senseering/urbanos-sdk/blob/main/docs/embedding.md#protocol-reference).

## Docs

[Documentation index](https://github.com/Senseering/urbanos-sdk/blob/main/docs/README.md)
