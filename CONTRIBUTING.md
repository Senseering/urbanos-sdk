# Contributing to the urbanOS SDK

Thanks for helping build the urbanOS SDK. This repo is the public contract third-party app
developers depend on, so we hold it to a high bar.

> **Status:** open source under Apache-2.0. Packages are published to **GitHub Packages**
> under the `@senseering` scope. Contributions are made under the **Developer Certificate
> of Origin** — sign your commits with `git commit -s`.

## Setup

```bash
corepack enable
pnpm install
pnpm build
pnpm test
```

Requires Node >= 22 and pnpm 10 (pinned via `packageManager`).

> **Heads up:** GitHub Packages requires authentication to _install_, even for public
> packages. `pnpm install` therefore needs a GitHub token with `read:packages` exported as
> `NODE_AUTH_TOKEN` (`write:packages` for releases). See
> [docs/getting-started.md](docs/getting-started.md#installing-the-packages).

## Rules of the road

- **Every PR touching `packages/**` needs a changeset** (`pnpm changeset`). CI enforces this.
- **Green means green:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build` must pass.
  TypeScript is strict; `any` is a lint error.
- **The bridge protocol and auth paths require a maintainer review** (see `CODEOWNERS`).
- **Framework boundaries are real:** `core` and `bridge` must not import any framework.
  `vue` may depend on them; `nuxt` wraps `vue`.
- Conventional-commit messages, please.

## Where things live

[`docs/`](docs/) is the developer-facing documentation — start at
[docs/README.md](docs/README.md). Each package also has its own `README.md`, and
[CLAUDE.md](CLAUDE.md) records the repo's working rules.

**When you change a public API, update the matching `docs/` page in the same PR.**
