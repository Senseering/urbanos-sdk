# Changesets

This folder is managed by [changesets](https://github.com/changesets/changesets). Every
PR that changes a published package must include a changeset:

```bash
pnpm changeset
```

Pick the affected packages, choose a semver bump, and write a human-readable summary. CI
fails a PR that touches `packages/**` without a changeset — comment-only edits count.
Releases are cut by the `release` workflow, which runs `changeset version` +
`changeset publish` to the `@datamatters-gmbh` scope on public npm.

Every exported type is a published contract. Changing one is a **major** bump, and the
changeset summary should say what consumers need to do.
