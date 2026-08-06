# @senseering/urbanos-vue

Vue 3 bindings over the core client: a plugin that provides the client and context,
`useUrbanOS()` to consume them, and `useAppState()` — the
loading / ready / empty / error contract every app screen routes through.

> Ships **no `Uos*` components** — only the plugin and the composables below.

## Install

```bash
pnpm add @senseering/urbanos-vue @senseering/urbanos-core vue
```

## Use

```ts
// main.ts
import { createApp } from 'vue';
import { createUrbanOS } from '@senseering/urbanos-vue';
import { DemoTransport, UrbanOSClient } from '@senseering/urbanos-core';

const client = new UrbanOSClient(new DemoTransport(dataset));

createApp(App).use(createUrbanOS({ client, context })).mount('#app');
```

```vue
<script setup lang="ts">
import { useAppState, useUrbanOS } from '@senseering/urbanos-vue';

const { client } = useUrbanOS();

const { state, data, error, reload } = useAppState(
  () => client.datasources({ category: 'parking' }),
  { isEmpty: (d) => d.length === 0 },
);
</script>
```

`createUrbanOS` takes an **already-constructed** client and context — it does not
build one for you. `useAppState` runs its loader immediately.

## Docs

- [Getting started](../../docs/getting-started.md#using-vue) — full wiring
- [API reference](../../docs/api-reference.md#senseeringurbanos-vue)
