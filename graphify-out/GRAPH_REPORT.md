# Graph Report - urbanos-sdk  (2026-07-30)

## Corpus Check
- 111 files · ~19,324 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 851 nodes · 1038 edges · 78 communities (65 shown, 13 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6dbabdca`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.ts
- package.json
- scripts
- package.json
- package.json
- package.json
- package.json
- package.json
- package.json
- package.json
- package.json
- Transport
- compilerOptions
- package.json
- transport.ts
- http-transport.ts
- errors.ts
- urbanOS SDK
- config.json
- index.ts
- CLAUDE.md — urbanos-sdk
- classify.ts
- @senseering/urbanos-nuxt
- @senseering/urbanos-vue
- index.ts
- CLAUDE.md — urbanos-sdk
- tsconfig.build.json
- tsconfig.build.json
- @senseering/urbanos-bridge
- tsconfig.build.json
- tsconfig.build.json
- tsconfig.build.json
- tsconfig.build.json
- tsconfig.build.json
- tsconfig.build.json
- tsconfig.build.json
- tsconfig.build.json
- index.ts
- context.ts
- tsconfig.json
- tsconfig.json
- tsconfig.json
- tsconfig.json
- 0.1.0
- tsconfig.json
- 0.1.0
- tsconfig.json
- tsconfig.json
- tsconfig.json
- tsconfig.json
- tsconfig.json
- .prettierrc.json
- Security Policy
- 0.1.0
- 0.0.1
- 0.1.0
- 0.1.0
- 0.1.0
- README.md
- CODE_OF_CONDUCT.md
- README.md
- README.md
- README.md
- README.md
- README.md
- README.md
- README.md
- README.md
- README.md
- README.md
- README.md

## God Nodes (most connected - your core abstractions)
1. `PkceTokenProvider` - 19 edges
2. `compilerOptions` - 17 edges
3. `Transport` - 13 edges
4. `DemoTransport` - 12 edges
5. `HttpTransport` - 11 edges
6. `AppBridge` - 11 edges
7. `ClockLike` - 10 edges
8. `scripts` - 10 edges
9. `createHost()` - 10 edges
10. `LocationLike` - 9 edges

## Surprising Connections (you probably didn't know these)
- `HostTokenProviderOptions` --references--> `ClockLike`  [EXTRACTED]
  packages/core/src/auth/host-token-provider.ts → packages/core/src/auth/env.ts
- `OAuthHttpOptions` --references--> `ClockLike`  [EXTRACTED]
  packages/core/src/auth/oauth-http.ts → packages/core/src/auth/env.ts
- `PkceTokenProvider` --references--> `ClockLike`  [EXTRACTED]
  packages/core/src/auth/pkce-token-provider.ts → packages/core/src/auth/env.ts
- `PkceTokenProviderOptions` --references--> `ClockLike`  [EXTRACTED]
  packages/core/src/auth/pkce-token-provider.ts → packages/core/src/auth/env.ts
- `PkceTokenProvider` --references--> `OAuthHttp`  [EXTRACTED]
  packages/core/src/auth/pkce-token-provider.ts → packages/core/src/auth/oauth-http.ts

## Import Cycles
- None detected.

## Communities (78 total, 13 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.07
Nodes (25): Channel, globalWindow(), linkedChannels(), MessageEventLike, ctx, harness(), MockWindow, windowChannel() (+17 more)

### Community 1 - "package.json"
Cohesion: 0.07
Nodes (29): dependencies, @senseering/urbanos-bridge, @senseering/urbanos-core, @senseering/urbanos-demo, description, devDependencies, typescript, vitest (+21 more)

### Community 2 - "scripts"
Cohesion: 0.07
Nodes (28): devDependencies, @changesets/cli, eslint, @eslint/js, prettier, @types/node, typescript, typescript-eslint (+20 more)

### Community 3 - "package.json"
Cohesion: 0.08
Nodes (26): bin, urbanos, dependencies, @senseering/urbanos-manifest, description, devDependencies, typescript, vitest (+18 more)

### Community 4 - "package.json"
Cohesion: 0.08
Nodes (24): bin, create-urbanos-app, description, devDependencies, typescript, vitest, exports, files (+16 more)

### Community 5 - "package.json"
Cohesion: 0.08
Nodes (24): dependencies, @senseering/urbanos-core, description, devDependencies, typescript, vitest, exports, files (+16 more)

### Community 6 - "package.json"
Cohesion: 0.08
Nodes (24): dependencies, zod, description, devDependencies, typescript, vitest, exports, files (+16 more)

### Community 7 - "package.json"
Cohesion: 0.08
Nodes (24): dependencies, @senseering/urbanos-vue, description, devDependencies, typescript, vitest, exports, files (+16 more)

### Community 8 - "package.json"
Cohesion: 0.09
Nodes (22): description, devDependencies, typescript, vitest, exports, files, import, license (+14 more)

### Community 9 - "package.json"
Cohesion: 0.09
Nodes (22): description, devDependencies, typescript, vitest, exports, files, import, license (+14 more)

### Community 10 - "package.json"
Cohesion: 0.09
Nodes (22): description, devDependencies, typescript, vitest, exports, files, import, license (+14 more)

### Community 11 - "Transport"
Cohesion: 0.06
Nodes (32): buildDataset(), run(), RunResult, Category, dataset, UrbanOSClient, DemoDataset, DemoEntity (+24 more)

### Community 12 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module (+10 more)

### Community 13 - "package.json"
Cohesion: 0.12
Nodes (16): dependencies, @senseering/urbanos-core, @senseering/urbanos-demo, description, devDependencies, tsx, typescript, vitest (+8 more)

### Community 14 - "transport.ts"
Cohesion: 0.07
Nodes (35): RFC-4648, assign(), browserLocation(), CryptoLike, g(), globalCrypto(), globalSessionStorage(), GlobalWithCrypto (+27 more)

### Community 15 - "http-transport.ts"
Cohesion: 0.25
Nodes (3): AccessToken, StaticTokenProvider, TokenProvider

### Community 16 - "errors.ts"
Cohesion: 0.06
Nodes (20): ClockLike, HostTokenProvider, HostTokenProviderOptions, HostTokenSource, OAuthHttp, OAuthHttpOptions, TokenResponseBody, HttpTransport (+12 more)

### Community 17 - "urbanOS SDK"
Cohesion: 0.18
Nodes (9): Contributing to the urbanOS SDK, Rules of the road, Setup, Where things live, Consuming these packages, Developing, Layout, Packages (+1 more)

### Community 19 - "config.json"
Cohesion: 0.20
Nodes (9): access, baseBranch, changelog, commit, fixed, ignore, linked, $schema (+1 more)

### Community 20 - "index.ts"
Cohesion: 0.24
Nodes (8): AppManifest, AppManifestInput, appManifestSchema, defineAppManifest(), localized, scopeRequest, valid, validateAppManifest()

### Community 21 - "CLAUDE.md — urbanos-sdk"
Cohesion: 0.22
Nodes (8): CLAUDE.md — urbanos-sdk, Commands, graphify, Hard rules (learned the hard way), Platform standards (subset — canonical list lives in `urbanos-apps/CLAUDE.md`), The urbanOS ecosystem, What this is, Workspace layout (packages/*, scope `@senseering/*`)

### Community 22 - "classify.ts"
Cohesion: 0.31
Nodes (7): CATEGORIES, classify(), classifyText(), Datasource, hasAny(), Stream, ClsCase

### Community 24 - "@senseering/urbanos-nuxt"
Cohesion: 0.22
Nodes (8): 0.1.0, 0.1.1, 0.1.2, Minor Changes, Patch Changes, Patch Changes, Patch Changes, @senseering/urbanos-nuxt

### Community 25 - "@senseering/urbanos-vue"
Cohesion: 0.22
Nodes (8): 0.1.0, 0.1.1, 0.1.2, Minor Changes, Patch Changes, Patch Changes, Patch Changes, @senseering/urbanos-vue

### Community 26 - "index.ts"
Cohesion: 0.33
Nodes (6): AppState, createUrbanOS(), UrbanOS, URBANOS_KEY, useAppState, useUrbanOS()

### Community 27 - "CLAUDE.md — urbanos-sdk"
Cohesion: 0.25
Nodes (7): CLAUDE.md — urbanos-sdk, Commands, Hard rules (learned the hard way), Platform standards (subset — canonical list lives in `urbanos-apps/CLAUDE.md`), The urbanOS ecosystem, What this is, Workspace layout (packages/*, scope `@senseering/*`)

### Community 28 - "tsconfig.build.json"
Cohesion: 0.25
Nodes (7): compilerOptions, noEmit, outDir, rootDir, exclude, extends, include

### Community 29 - "tsconfig.build.json"
Cohesion: 0.25
Nodes (7): compilerOptions, noEmit, outDir, rootDir, exclude, extends, include

### Community 30 - "@senseering/urbanos-bridge"
Cohesion: 0.25
Nodes (7): 0.1.0, 0.2.0, 0.3.0, Minor Changes, Minor Changes, Minor Changes, @senseering/urbanos-bridge

### Community 31 - "tsconfig.build.json"
Cohesion: 0.25
Nodes (7): compilerOptions, noEmit, outDir, rootDir, exclude, extends, include

### Community 32 - "tsconfig.build.json"
Cohesion: 0.25
Nodes (7): compilerOptions, noEmit, outDir, rootDir, exclude, extends, include

### Community 35 - "tsconfig.build.json"
Cohesion: 0.25
Nodes (7): compilerOptions, noEmit, outDir, rootDir, exclude, extends, include

### Community 36 - "tsconfig.build.json"
Cohesion: 0.25
Nodes (7): compilerOptions, noEmit, outDir, rootDir, exclude, extends, include

### Community 37 - "tsconfig.build.json"
Cohesion: 0.25
Nodes (7): compilerOptions, noEmit, outDir, rootDir, exclude, extends, include

### Community 38 - "tsconfig.build.json"
Cohesion: 0.25
Nodes (7): compilerOptions, noEmit, outDir, rootDir, exclude, extends, include

### Community 39 - "tsconfig.build.json"
Cohesion: 0.25
Nodes (7): compilerOptions, noEmit, outDir, rootDir, exclude, extends, include

### Community 40 - "tsconfig.build.json"
Cohesion: 0.25
Nodes (7): compilerOptions, noEmit, outDir, rootDir, exclude, extends, include

### Community 41 - "index.ts"
Cohesion: 0.43
Nodes (5): dailyRhythm(), DailyRhythmOptions, defineDemoDataset(), DefineDemoDatasetInput, seededRng()

### Community 43 - "context.ts"
Cohesion: 0.33
Nodes (4): Mode, ThemeContext, UrbanOSContext, UserContext

### Community 44 - "tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, noEmit, resolveJsonModule, extends, include

### Community 45 - "tsconfig.json"
Cohesion: 0.40
Nodes (4): compilerOptions, noEmit, extends, include

### Community 46 - "tsconfig.json"
Cohesion: 0.40
Nodes (4): compilerOptions, noEmit, extends, include

### Community 47 - "tsconfig.json"
Cohesion: 0.40
Nodes (4): compilerOptions, noEmit, extends, include

### Community 48 - "0.1.0"
Cohesion: 0.40
Nodes (4): 0.1.0, Minor Changes, Patch Changes, @senseering/urbanos-cli

### Community 49 - "tsconfig.json"
Cohesion: 0.40
Nodes (4): compilerOptions, noEmit, extends, include

### Community 50 - "0.1.0"
Cohesion: 0.40
Nodes (4): 0.1.0, Minor Changes, Patch Changes, @senseering/urbanos-demo

### Community 51 - "tsconfig.json"
Cohesion: 0.40
Nodes (4): compilerOptions, noEmit, extends, include

### Community 52 - "tsconfig.json"
Cohesion: 0.40
Nodes (4): compilerOptions, noEmit, extends, include

### Community 53 - "tsconfig.json"
Cohesion: 0.40
Nodes (4): compilerOptions, noEmit, extends, include

### Community 54 - "tsconfig.json"
Cohesion: 0.40
Nodes (4): compilerOptions, noEmit, extends, include

### Community 55 - "tsconfig.json"
Cohesion: 0.40
Nodes (4): compilerOptions, noEmit, extends, include

### Community 56 - ".prettierrc.json"
Cohesion: 0.40
Nodes (4): printWidth, semi, singleQuote, trailingComma

### Community 57 - "Security Policy"
Cohesion: 0.40
Nodes (4): In scope, Out of scope, Reporting a vulnerability, Security Policy

### Community 58 - "0.1.0"
Cohesion: 0.50
Nodes (3): 0.1.0, Minor Changes, @senseering/create-urbanos-app

### Community 59 - "0.0.1"
Cohesion: 0.50
Nodes (3): 0.0.1, Patch Changes, @urbanos-examples/minimal-vanilla

### Community 60 - "0.1.0"
Cohesion: 0.50
Nodes (3): 0.1.0, Minor Changes, @senseering/urbanos-core

### Community 61 - "0.1.0"
Cohesion: 0.50
Nodes (3): 0.1.0, Minor Changes, @senseering/urbanos-manifest

### Community 62 - "0.1.0"
Cohesion: 0.50
Nodes (3): 0.1.0, Minor Changes, @senseering/urbanos-tokens

## Knowledge Gaps
- **414 isolated node(s):** `GlobalWithCrypto`, `TokenResponseBody`, `Recorded`, `OK_TOKEN`, `RFC-6749` (+409 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PkceTokenProvider` connect `transport.ts` to `errors.ts`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Why does `AuthError` connect `errors.ts` to `transport.ts`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `GlobalWithCrypto`, `TokenResponseBody`, `Recorded` to the rest of the system?**
  _414 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06848357791754019 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._