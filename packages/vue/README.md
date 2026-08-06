# @datamatters-gmbh/urbanos-vue

Vue 3 bindings over the core client: a plugin that provides the client and context,
`useUrbanOS()` to consume them, and `useAppState()` — the
loading / ready / empty / error contract every app screen routes through.

> Ships **no `Uos*` components** — only the plugin and the composables below.

## Install

```bash
pnpm add @datamatters-gmbh/urbanos-vue @datamatters-gmbh/urbanos-core vue
```

## Use

```ts
// main.ts
import { createApp } from 'vue';
import { createUrbanOS } from '@datamatters-gmbh/urbanos-vue';
import { DemoTransport, UrbanOSClient } from '@datamatters-gmbh/urbanos-core';

const client = new UrbanOSClient(new DemoTransport(dataset));

createApp(App).use(createUrbanOS({ client, context })).mount('#app');
```

```vue
<script setup lang="ts">
import { useAppState, useUrbanOS } from '@datamatters-gmbh/urbanos-vue';

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

- [Getting started](https://github.com/Senseering/urbanos-sdk/blob/main/docs/getting-started.md#using-vue) — full wiring
- [API reference](https://github.com/Senseering/urbanos-sdk/blob/main/docs/api-reference.md#datamatters-gmbhurbanos-vue)
