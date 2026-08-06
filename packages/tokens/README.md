# @datamatters-gmbh/urbanos-tokens

The planned design tokens: CSS variables, Tailwind preset, dark-mode contract.

> **Not implemented yet.** This package publishes so the build pipeline is exercised
> end to end, but it exports only a version constant — no token values, no CSS, no
> Tailwind preset.

## What to use instead

Read theme values from the bridge context and apply them yourself:

```ts
const { mode, primaryColor } = bridge.context.theme;

document.documentElement.dataset.theme = mode; // 'light' | 'dark'
document.documentElement.style.setProperty('--primary', primaryColor);

bridge.onContextChanged((ctx) => applyTheme(ctx.theme));
```

Following the host's theme matters — an embedded app that ignores it looks broken
next to the shell.

## Docs

- [Embedding](https://github.com/Senseering/urbanos-sdk/blob/main/docs/embedding.md#the-context)
- [Documentation index](https://github.com/Senseering/urbanos-sdk/blob/main/docs/README.md)
