---
'@datamatters-gmbh/create-urbanos-app': minor
'@datamatters-gmbh/urbanos-manifest': minor
'@datamatters-gmbh/urbanos-bridge': minor
'@datamatters-gmbh/urbanos-tokens': minor
'@datamatters-gmbh/urbanos-core': minor
'@datamatters-gmbh/urbanos-demo': minor
'@datamatters-gmbh/urbanos-nuxt': minor
'@datamatters-gmbh/urbanos-cli': minor
'@datamatters-gmbh/urbanos-vue': minor
---

Move to public npm under the `@datamatters-gmbh` scope.

Packages were previously published to GitHub Packages as `@senseering/*`, which
required every consumer to create a GitHub token with `read:packages` just to
install — GitHub's npm registry authenticates downloads even for public packages.
Installing is now a plain `pnpm add`, with no registry configuration and no token.

**Renaming your imports is the whole migration:**

```diff
-import { UrbanOSClient } from '@senseering/urbanos-core';
+import { UrbanOSClient } from '@datamatters-gmbh/urbanos-core';
```

You can also drop the `@senseering:registry` line and the `read:packages` token
from your `.npmrc`. No API changed as part of the move. The `@senseering/*`
packages on GitHub Packages stay published at their last version but receive no
further releases.

Releases now publish with [npm provenance](https://docs.npmjs.com/generating-provenance-statements),
so each version is cryptographically attested to this repository and the workflow
run that built it.

Published tarballs no longer contain `.js.map` / `.d.ts.map` files. They were dead
weight: `files` only packs `dist`, so the maps pointed at `../src/*.ts` paths that
were never in the tarball and resolved to nothing. Source is on GitHub. Every
package now also ships its own `LICENSE` alongside its `README`.
