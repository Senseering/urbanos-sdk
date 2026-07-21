# Contributing to the urbanOS SDK

Thanks for helping build the urbanOS SDK. This repo is the public contract third-party app
developers depend on, so we hold it to a high bar.

> **Status:** the SDK is currently published **privately** to GitHub Packages under the
> `@senseering` scope while it incubates. It is intended to become open source (Apache-2.0)
> under the `@urbanos` npm scope. Contributions are made under the **Developer Certificate
> of Origin** — sign your commits with `git commit -s`.

## Setup

```bash
corepack enable
pnpm install
pnpm build
pnpm test
```

Requires Node >= 22 and pnpm 10 (pinned via `packageManager`). To install/publish packages
you need a GitHub token with `read:packages` (and `write:packages` for releases) exported as
`NODE_AUTH_TOKEN`.

## Rules of the road

- **Every PR touching `packages/**` needs a changeset** (`pnpm changeset`). CI enforces this.
- **Green means green:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build` must pass.
  TypeScript is strict; `any` is a lint error.
- **The bridge protocol and auth paths require a maintainer review** (see `CODEOWNERS`).
- **Framework boundaries are real:** `core` and `bridge` must not import any framework.
  `vue` may depend on them; `nuxt` wraps `vue`.
- Conventional-commit messages, please.

## Where things live

Developer documentation is maintained in this repository.
