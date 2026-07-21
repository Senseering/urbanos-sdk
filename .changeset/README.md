# Changesets

This folder is managed by [changesets](https://github.com/changesets/changesets). Every
PR that changes a published package must include a changeset:

```bash
pnpm changeset
```

Pick the affected packages, choose a semver bump, and write a human-readable summary. CI
fails a PR that touches `packages/**` without a changeset. Releases are cut by the
`release` workflow, which runs `changeset version` + `changeset publish` to the private
`@senseering` GitHub Packages registry.

Note: `access` is `restricted` while the SDK is private. It flips to `public` when the
packages move to the `@urbanos` npm scope.
