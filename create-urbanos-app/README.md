# @senseering/create-urbanos-app

The planned `npm create` scaffolder for new urbanOS apps.

> **Not implemented yet.** This package publishes so the build pipeline is exercised
> end to end, but it ships **no templates** and generates no files.

## What to use instead

Copy [`examples/minimal-vanilla`](../examples/minimal-vanilla) — a complete working
app that builds a deterministic demo dataset and queries it through the client, with
no gateway, network, or auth:

```bash
cp -r examples/minimal-vanilla ../my-urbanos-app
```

Then follow [getting started](../docs/getting-started.md) to add your own dataset and,
when you're ready, swap in `HttpTransport` for live data.

## Docs

[Documentation index](../docs/README.md)
