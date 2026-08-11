# Graph Report - urbanos-sdk  (2026-08-11)

## Corpus Check
- 120 files · ~35,274 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1047 nodes · 1195 edges · 82 communities (79 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b21879be`
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
- env.ts
- config.json
- index.ts
- http-transport.ts
- classify.ts
- Authentication
- @senseering/urbanos-nuxt
- @senseering/urbanos-vue
- index.ts
- CLAUDE.md — urbanos-sdk
- tsconfig.build.json
- tsconfig.build.json
- @senseering/urbanos-bridge
- tsconfig.build.json
- tsconfig.build.json
- @senseering/urbanos-core
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
- Querying data
- Demo mode
- Embedding
- Field reference
- @senseering/urbanos-cli

## God Nodes (most connected - your core abstractions)
1. `PkceTokenProvider` - 17 edges
2. `compilerOptions` - 17 edges
3. `Transport` - 14 edges
4. `DemoTransport` - 11 edges
5. `HttpTransport` - 11 edges
6. `@datamatters-gmbh/urbanos-core` - 10 edges
7. `AppBridge` - 10 edges
8. `scripts` - 10 edges
9. `Embedding` - 9 edges
10. `Host` - 9 edges

## Surprising Connections (you probably didn't know these)
- `HostTokenProviderOptions` --references--> `ClockLike`  [EXTRACTED]
  packages/core/src/auth/host-token-provider.ts → packages/core/src/auth/env.ts
- `OAuthHttpOptions` --references--> `ClockLike`  [EXTRACTED]
  packages/core/src/auth/oauth-http.ts → packages/core/src/auth/env.ts
- `jwt()` --calls--> `base64UrlEncode()`  [EXTRACTED]
  packages/core/src/auth/pkce.test.ts → packages/core/src/auth/pkce.ts
- `HttpTransportOptions` --references--> `TokenProvider`  [EXTRACTED]
  packages/core/src/client/http-transport.ts → packages/core/src/auth/token-provider.ts
- `HostTokenProvider` --references--> `ClockLike`  [EXTRACTED]
  packages/core/src/auth/host-token-provider.ts → packages/core/src/auth/env.ts

## Import Cycles
- None detected.

## Communities (82 total, 3 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.06
Nodes (25): Channel, globalWindow(), linkedChannels(), MessageEventLike, ctx, harness(), MockWindow, windowChannel() (+17 more)

### Community 1 - "package.json"
Cohesion: 0.06
Nodes (36): author, bugs, url, dependencies, @datamatters-gmbh/urbanos-bridge, @datamatters-gmbh/urbanos-core, @datamatters-gmbh/urbanos-demo, description (+28 more)

### Community 2 - "scripts"
Cohesion: 0.07
Nodes (28): devDependencies, @changesets/cli, eslint, @eslint/js, prettier, @types/node, typescript, typescript-eslint (+20 more)

### Community 3 - "package.json"
Cohesion: 0.06
Nodes (33): author, bin, urbanos, bugs, url, dependencies, @datamatters-gmbh/urbanos-manifest, description (+25 more)

### Community 4 - "package.json"
Cohesion: 0.06
Nodes (31): author, bin, create-urbanos-app, bugs, url, description, devDependencies, typescript (+23 more)

### Community 5 - "package.json"
Cohesion: 0.06
Nodes (31): author, bugs, url, dependencies, @datamatters-gmbh/urbanos-core, description, devDependencies, typescript (+23 more)

### Community 6 - "package.json"
Cohesion: 0.06
Nodes (31): author, bugs, url, dependencies, zod, description, devDependencies, typescript (+23 more)

### Community 7 - "package.json"
Cohesion: 0.06
Nodes (31): author, bugs, url, dependencies, @datamatters-gmbh/urbanos-vue, description, devDependencies, typescript (+23 more)

### Community 8 - "package.json"
Cohesion: 0.07
Nodes (29): author, bugs, url, description, devDependencies, typescript, vitest, engines (+21 more)

### Community 9 - "package.json"
Cohesion: 0.07
Nodes (29): author, bugs, url, description, devDependencies, typescript, vitest, engines (+21 more)

### Community 10 - "package.json"
Cohesion: 0.07
Nodes (29): author, bugs, url, description, devDependencies, typescript, vitest, engines (+21 more)

### Community 11 - "Transport"
Cohesion: 0.06
Nodes (29): Category, dataset, UrbanOSClient, DemoDataset, DemoEntity, DemoStream, DemoTransport, HttpTransport (+21 more)

### Community 12 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module (+10 more)

### Community 13 - "package.json"
Cohesion: 0.12
Nodes (16): dependencies, @datamatters-gmbh/urbanos-core, @datamatters-gmbh/urbanos-demo, description, devDependencies, tsx, typescript, vitest (+8 more)

### Community 14 - "transport.ts"
Cohesion: 0.31
Nodes (7): CATEGORIES, classify(), classifyText(), Datasource, hasAny(), Stream, ClsCase

### Community 15 - "http-transport.ts"
Cohesion: 0.09
Nodes (13): PendingTx, PendingTxMap, PkceTokenProvider, PkceTokenProviderOptions, authed(), fakeLocation(), makeProvider(), OK_TOKEN (+5 more)

### Community 16 - "env.ts"
Cohesion: 0.06
Nodes (27): RFC-4648, assign(), browserLocation(), ClockLike, CryptoLike, g(), globalCrypto(), globalSessionStorage() (+19 more)

### Community 19 - "config.json"
Cohesion: 0.20
Nodes (9): access, baseBranch, changelog, commit, fixed, ignore, linked, $schema (+1 more)

### Community 20 - "index.ts"
Cohesion: 0.24
Nodes (8): AppManifest, AppManifestInput, appManifestSchema, defineAppManifest(), localized, scopeRequest, valid, validateAppManifest()

### Community 21 - "http-transport.ts"
Cohesion: 0.10
Nodes (15): AccessToken, StaticTokenProvider, TokenProvider, HttpTransportOptions, RawResult, Call, rotatingProvider(), token() (+7 more)

### Community 22 - "classify.ts"
Cohesion: 0.53
Nodes (3): buildDataset(), run(), RunResult

### Community 23 - "Authentication"
Cohesion: 0.10
Nodes (21): 1. Your organisation is approved as a developer, 2. You have a registered client, 3. Your redirect URI matches exactly, 4. Your origin is allowlisted for CORS, And one more: the app must be installed, Authentication, Available scopes, Before you write any code (+13 more)

### Community 24 - "@senseering/urbanos-nuxt"
Cohesion: 0.22
Nodes (8): 0.1.0, 0.1.1, 0.1.2, @datamatters-gmbh/urbanos-nuxt, Minor Changes, Patch Changes, Patch Changes, Patch Changes

### Community 25 - "@senseering/urbanos-vue"
Cohesion: 0.22
Nodes (8): 0.1.0, 0.1.1, 0.1.2, @datamatters-gmbh/urbanos-vue, Minor Changes, Patch Changes, Patch Changes, Patch Changes

### Community 26 - "index.ts"
Cohesion: 0.33
Nodes (6): AppState, createUrbanOS(), UrbanOS, URBANOS_KEY, useAppState, useUrbanOS()

### Community 27 - "CLAUDE.md — urbanos-sdk"
Cohesion: 0.22
Nodes (8): CLAUDE.md — urbanos-sdk, Commands, graphify, Hard rules (learned the hard way), Platform standards, What this is, Where the docs live, Workspace layout (packages/*, scope `@datamatters-gmbh/*`)

### Community 28 - "tsconfig.build.json"
Cohesion: 0.25
Nodes (7): compilerOptions, noEmit, outDir, rootDir, exclude, extends, include

### Community 29 - "tsconfig.build.json"
Cohesion: 0.25
Nodes (7): compilerOptions, noEmit, outDir, rootDir, exclude, extends, include

### Community 30 - "@senseering/urbanos-bridge"
Cohesion: 0.25
Nodes (7): 0.1.0, 0.2.0, 0.3.0, @datamatters-gmbh/urbanos-bridge, Minor Changes, Minor Changes, Minor Changes

### Community 31 - "tsconfig.build.json"
Cohesion: 0.25
Nodes (7): compilerOptions, noEmit, outDir, rootDir, exclude, extends, include

### Community 32 - "tsconfig.build.json"
Cohesion: 0.25
Nodes (7): compilerOptions, noEmit, outDir, rootDir, exclude, extends, include

### Community 33 - "@senseering/urbanos-core"
Cohesion: 0.11
Nodes (19): API reference, App side, Auth, Channels, Classification, Client, Constants, Context (+11 more)

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
Nodes (4): 0.1.0, @datamatters-gmbh/urbanos-cli, Minor Changes, Patch Changes

### Community 49 - "tsconfig.json"
Cohesion: 0.40
Nodes (4): compilerOptions, noEmit, extends, include

### Community 50 - "0.1.0"
Cohesion: 0.40
Nodes (4): 0.1.0, @datamatters-gmbh/urbanos-demo, Minor Changes, Patch Changes

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

### Community 58 - "0.1.0"
Cohesion: 0.50
Nodes (3): 0.1.0, @datamatters-gmbh/create-urbanos-app, Minor Changes

### Community 59 - "0.0.1"
Cohesion: 0.50
Nodes (3): 0.0.1, Patch Changes, @urbanos-examples/minimal-vanilla

### Community 60 - "0.1.0"
Cohesion: 0.50
Nodes (3): 0.1.0, @datamatters-gmbh/urbanos-core, Minor Changes

### Community 61 - "0.1.0"
Cohesion: 0.50
Nodes (3): 0.1.0, @datamatters-gmbh/urbanos-manifest, Minor Changes

### Community 62 - "0.1.0"
Cohesion: 0.50
Nodes (3): 0.1.0, @datamatters-gmbh/urbanos-tokens, Minor Changes

### Community 65 - "README.md"
Cohesion: 0.50
Nodes (3): @datamatters-gmbh/create-urbanos-app, Docs, What to use instead

### Community 68 - "README.md"
Cohesion: 0.40
Nodes (4): @datamatters-gmbh/urbanos-bridge, Docs, Install, Use

### Community 69 - "README.md"
Cohesion: 0.05
Nodes (37): CLAUDE.md — urbanos-sdk, Commands, graphify, Hard rules (learned the hard way), Platform standards, What this is, Where the docs live, Workspace layout (packages/*, scope `@datamatters-gmbh/*`) (+29 more)

### Community 71 - "README.md"
Cohesion: 0.40
Nodes (4): @datamatters-gmbh/urbanos-core, Docs, Install, Use

### Community 73 - "README.md"
Cohesion: 0.40
Nodes (4): @datamatters-gmbh/urbanos-demo, Docs, Install, Use

### Community 74 - "README.md"
Cohesion: 0.40
Nodes (4): @datamatters-gmbh/urbanos-manifest, Docs, Install, Use

### Community 75 - "README.md"
Cohesion: 0.50
Nodes (3): @datamatters-gmbh/urbanos-nuxt, Docs, What to use instead

### Community 77 - "README.md"
Cohesion: 0.50
Nodes (3): @datamatters-gmbh/urbanos-tokens, Docs, What to use instead

### Community 79 - "README.md"
Cohesion: 0.40
Nodes (4): @datamatters-gmbh/urbanos-vue, Docs, Install, Use

### Community 82 - "Querying data"
Cohesion: 0.14
Nodes (14): Aggregating, App storage, Categories, Choosing a range, Datasources and streams, Elements, Error handling, Limits (+6 more)

### Community 84 - "Demo mode"
Cohesion: 0.18
Nodes (11): `dailyRhythm(opts)`, Defining a dataset, Demo mode, Generators, Sample resolution, `seededRng(seed)`, Switching modes, Testing with it (+3 more)

### Community 85 - "Embedding"
Cohesion: 0.18
Nodes (11): Capabilities, Connecting, Embedding, Getting a token, Hosting an app, Listening to the host, Origin security, Protocol reference (+3 more)

### Community 86 - "Field reference"
Cohesion: 0.20
Nodes (10): Checklist, Demo, Field reference, Optional, Publishing to the store, Required, Scopes and reasons, Screens (+2 more)

### Community 91 - "@senseering/urbanos-cli"
Cohesion: 0.50
Nodes (3): @datamatters-gmbh/urbanos-cli, Docs, What to use instead

## Knowledge Gaps
- **556 isolated node(s):** `Two modes`, `1. Your organisation is approved as a developer`, `2. You have a registered client`, `3. Your redirect URI matches exactly`, `4. Your origin is allowlisted for CORS` (+551 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `API reference` connect `@senseering/urbanos-core` to `README.md`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `Querying data` connect `Querying data` to `README.md`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Why does `Authentication` connect `Authentication` to `README.md`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **What connects `Two modes`, `1. Your organisation is approved as a developer`, `2. You have a registered client` to the rest of the system?**
  _556 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05520614954577219 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._