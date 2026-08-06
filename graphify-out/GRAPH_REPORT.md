# Graph Report - urbanos-sdk  (2026-08-06)

## Corpus Check
- 121 files · ~29,830 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 981 nodes · 1252 edges · 98 communities (92 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `41517d3a`
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
- oauth-http.ts
- tsconfig.build.json
- tsconfig.build.json
- tsconfig.build.json
- tsconfig.build.json
- tsconfig.build.json
- tsconfig.build.json
- index.ts
- pkce.ts
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
- Querying data
- pkce-token-provider.test.ts
- Demo mode
- Embedding
- Field reference
- PkceTokenProvider
- Getting started
- urbanOS SDK
- urbanOS SDK documentation
- @senseering/urbanos-cli
- demo-transport.ts
- query.ts
- HttpTransport
- run

## God Nodes (most connected - your core abstractions)
1. `PkceTokenProvider` - 21 edges
2. `AccessToken` - 17 edges
3. `compilerOptions` - 17 edges
4. `Transport` - 14 edges
5. `createHost()` - 11 edges
6. `AppBridge` - 11 edges
7. `TokenProvider` - 11 edges
8. `DemoTransport` - 11 edges
9. `HttpTransport` - 11 edges
10. `scripts` - 10 edges

## Surprising Connections (you probably didn't know these)
- `jwtWithEl()` --calls--> `base64UrlEncode()`  [EXTRACTED]
  packages/core/src/auth/pkce-token-provider.test.ts → packages/core/src/auth/pkce.ts
- `PkceTokenProvider` --references--> `CryptoLike`  [EXTRACTED]
  packages/core/src/auth/pkce-token-provider.ts → packages/core/src/auth/env.ts
- `PkceTokenProvider` --references--> `StorageLike`  [EXTRACTED]
  packages/core/src/auth/pkce-token-provider.ts → packages/core/src/auth/env.ts
- `PkceTokenProviderOptions` --references--> `StorageLike`  [EXTRACTED]
  packages/core/src/auth/pkce-token-provider.ts → packages/core/src/auth/env.ts
- `PkceTokenProviderOptions` --references--> `LocationLike`  [EXTRACTED]
  packages/core/src/auth/pkce-token-provider.ts → packages/core/src/auth/env.ts

## Import Cycles
- None detected.

## Communities (98 total, 6 thin omitted)

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
Cohesion: 0.17
Nodes (3): UrbanOSClient, ElementView, Transport

### Community 12 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module (+10 more)

### Community 13 - "package.json"
Cohesion: 0.12
Nodes (16): dependencies, @senseering/urbanos-core, @senseering/urbanos-demo, description, devDependencies, tsx, typescript, vitest (+8 more)

### Community 14 - "transport.ts"
Cohesion: 0.21
Nodes (8): assign(), browserLocation(), g(), globalCrypto(), globalSessionStorage(), GlobalWithCrypto, replaceState(), StorageLike

### Community 15 - "http-transport.ts"
Cohesion: 0.22
Nodes (12): AggregateSpec, SeriesPoint, StreamView, AggFunc, aggregate(), apply(), Bucket, fillGaps() (+4 more)

### Community 16 - "errors.ts"
Cohesion: 0.20
Nodes (7): ClockLike, HostTokenProvider, HostTokenProviderOptions, HostTokenSource, OAuthHttp, OAuthHttpOptions, AccessToken

### Community 17 - "urbanOS SDK"
Cohesion: 0.50
Nodes (4): Contributing to the urbanOS SDK, Rules of the road, Setup, Where things live

### Community 19 - "config.json"
Cohesion: 0.20
Nodes (9): access, baseBranch, changelog, commit, fixed, ignore, linked, $schema (+1 more)

### Community 20 - "index.ts"
Cohesion: 0.24
Nodes (8): AppManifest, AppManifestInput, appManifestSchema, defineAppManifest(), localized, scopeRequest, valid, validateAppManifest()

### Community 21 - "CLAUDE.md — urbanos-sdk"
Cohesion: 0.22
Nodes (8): CLAUDE.md — urbanos-sdk, Commands, graphify, Hard rules (learned the hard way), Platform standards, What this is, Where the docs live, Workspace layout (packages/*, scope `@senseering/*`)

### Community 22 - "classify.ts"
Cohesion: 0.31
Nodes (7): CATEGORIES, classify(), classifyText(), Datasource, hasAny(), Stream, ClsCase

### Community 23 - "Authentication"
Cohesion: 0.10
Nodes (21): 1. Your organisation is approved as a developer, 2. You have a registered client, 3. Your redirect URI matches exactly, 4. Your origin is allowlisted for CORS, And one more: the app must be installed, Authentication, Available scopes, Before you write any code (+13 more)

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
Cohesion: 0.22
Nodes (8): CLAUDE.md — urbanos-sdk, Commands, graphify, Hard rules (learned the hard way), Platform standards, What this is, Where the docs live, Workspace layout (packages/*, scope `@senseering/*`)

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

### Community 33 - "@senseering/urbanos-core"
Cohesion: 0.11
Nodes (19): API reference, App side, Auth, Channels, Classification, Client, Constants, Context (+11 more)

### Community 34 - "oauth-http.ts"
Cohesion: 0.10
Nodes (15): TokenResponseBody, StaticTokenProvider, TokenProvider, HttpTransportOptions, RawResult, Call, rotatingProvider(), token() (+7 more)

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

### Community 42 - "pkce.ts"
Cohesion: 0.23
Nodes (14): RFC-4648, CryptoLike, base64UrlDecode(), base64UrlEncode(), createCodeChallenge(), createCodeVerifier(), createState(), readElementClaim() (+6 more)

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

### Community 65 - "README.md"
Cohesion: 0.50
Nodes (3): Docs, @senseering/create-urbanos-app, What to use instead

### Community 68 - "README.md"
Cohesion: 0.40
Nodes (4): Docs, Install, @senseering/urbanos-bridge, Use

### Community 71 - "README.md"
Cohesion: 0.50
Nodes (4): Docs, Install, @senseering/urbanos-core, Use

### Community 73 - "README.md"
Cohesion: 0.40
Nodes (4): Docs, Install, @senseering/urbanos-demo, Use

### Community 74 - "README.md"
Cohesion: 0.40
Nodes (4): Docs, Install, @senseering/urbanos-manifest, Use

### Community 75 - "README.md"
Cohesion: 0.50
Nodes (3): Docs, @senseering/urbanos-nuxt, What to use instead

### Community 77 - "README.md"
Cohesion: 0.50
Nodes (3): Docs, @senseering/urbanos-tokens, What to use instead

### Community 79 - "README.md"
Cohesion: 0.40
Nodes (4): Docs, Install, @senseering/urbanos-vue, Use

### Community 82 - "Querying data"
Cohesion: 0.14
Nodes (14): Aggregating, App storage, Categories, Choosing a range, Datasources and streams, Elements, Error handling, Limits (+6 more)

### Community 83 - "pkce-token-provider.test.ts"
Cohesion: 0.20
Nodes (11): memoryStorage(), seededCrypto(), authed(), fakeLocation(), jwtWithEl(), makeProvider(), OK_TOKEN, primed() (+3 more)

### Community 84 - "Demo mode"
Cohesion: 0.18
Nodes (11): `dailyRhythm(opts)`, Defining a dataset, Demo mode, Generators, Sample resolution, `seededRng(seed)`, Switching modes, Testing with it (+3 more)

### Community 85 - "Embedding"
Cohesion: 0.18
Nodes (11): Capabilities, Connecting, Embedding, Getting a token, Hosting an app, Listening to the host, Origin security, Protocol reference (+3 more)

### Community 86 - "Field reference"
Cohesion: 0.20
Nodes (10): Checklist, Demo, Field reference, Optional, Publishing to the store, Required, Scopes and reasons, Screens (+2 more)

### Community 88 - "Getting started"
Cohesion: 0.29
Nodes (7): Getting started, Going live, Installing the packages, Requirements, Using Vue, Where to go next, Your first app (offline)

### Community 89 - "urbanOS SDK"
Cohesion: 0.29
Nodes (7): Developing, Documentation, Install, License, Packages, Thirty seconds, urbanOS SDK

### Community 90 - "urbanOS SDK documentation"
Cohesion: 0.33
Nodes (6): Getting help, Guides, Packages at a glance, Start here, The one idea worth knowing up front, urbanOS SDK documentation

### Community 91 - "@senseering/urbanos-cli"
Cohesion: 0.67
Nodes (3): Docs, @senseering/urbanos-cli, What to use instead

### Community 93 - "demo-transport.ts"
Cohesion: 0.19
Nodes (6): Category, dataset, DemoDataset, DemoEntity, DemoStream, DemoTransport

### Community 94 - "query.ts"
Cohesion: 0.27
Nodes (6): QueryResult, TimeseriesQuery, parseDuration(), RangeSpec, TimeseriesQueryBuilder, toISO()

### Community 96 - "run"
Cohesion: 0.53
Nodes (3): buildDataset(), run(), RunResult

## Knowledge Gaps
- **507 isolated node(s):** `$schema`, `changelog`, `commit`, `fixed`, `linked` (+502 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createHost()` connect `index.ts` to `errors.ts`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `AccessToken` connect `errors.ts` to `oauth-http.ts`, `pkce.ts`, `PkceTokenProvider`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `Authentication` connect `Authentication` to `README.md`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `createHost()` (e.g. with `.toast()` and `.token()`) actually correct?**
  _`createHost()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `changelog`, `commit` to the rest of the system?**
  _507 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06848357791754019 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._