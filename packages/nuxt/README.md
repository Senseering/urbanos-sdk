# @senseering/urbanos-nuxt

The planned Nuxt module wrapping the Vue bindings (plugin wiring, SSR safety,
auto-imports).

> **Not implemented yet.** This package publishes so the build pipeline is exercised
> end to end, but it exports only a version constant — there is no `defineNuxtModule`,
> no plugin, and no auto-imports.

## What to use instead

Wire `@senseering/urbanos-vue` manually from a client-side Nuxt plugin:

```ts
// plugins/urbanos.client.ts
import { createUrbanOS } from '@senseering/urbanos-vue';
import { DemoTransport, UrbanOSClient } from '@senseering/urbanos-core';

export default defineNuxtPlugin((nuxtApp) => {
  const client = new UrbanOSClient(new DemoTransport(dataset));
  nuxtApp.vueApp.use(createUrbanOS({ client, context }));
});
```

The `.client.ts` suffix matters — the auth providers need browser APIs and must not
run during SSR.

## Docs

- [Getting started](../../docs/getting-started.md#using-vue)
- [Documentation index](../../docs/README.md)
