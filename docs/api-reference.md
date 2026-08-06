# API reference

Every public export, by package. For guided explanations see the other pages in
[`docs/`](README.md).

**All packages are ESM-only** (no CommonJS build) and use **named exports** — there
are no default exports. Types need `import type`.

- [@datamatters-gmbh/urbanos-core](#datamatters-gmbhurbanos-core)
- [@datamatters-gmbh/urbanos-bridge](#datamatters-gmbhurbanos-bridge)
- [@datamatters-gmbh/urbanos-demo](#datamatters-gmbhurbanos-demo)
- [@datamatters-gmbh/urbanos-manifest](#datamatters-gmbhurbanos-manifest)
- [@datamatters-gmbh/urbanos-vue](#datamatters-gmbhurbanos-vue)
- [Not yet implemented](#not-yet-implemented)

## @datamatters-gmbh/urbanos-core

### Client

```ts
class UrbanOSClient {
  constructor(transport: Transport);
  readonly storage: {
    get(key: string): Promise<unknown>;
    put(key: string, value: unknown): Promise<void>;
  };
  element(): Promise<ElementView>;
  datasources(opts?: { category?: string }): Promise<DatasourceView[]>;
  timeseries(streamId: number): TimeseriesQueryBuilder;
}
```

### Transport

```ts
interface Transport {
  getElement(): Promise<ElementView>;
  listDatasources(opts?: { category?: string }): Promise<DatasourceView[]>;
  queryTimeseries(queries: TimeseriesQuery[]): Promise<QueryResult[]>;
  getStorage(key: string): Promise<unknown>;
  putStorage(key: string, value: unknown): Promise<void>;
}
```

DTOs:

```ts
interface ElementView {
  id: number;
  name: string;
}
interface StreamView {
  id: number;
  name: string;
  unit: string;
}
interface DatasourceView {
  id: number;
  element_id: number;
  name: string;
  category: string;
  lat: number;
  long: number;
  streams: StreamView[];
}
interface AggregateSpec {
  function: AggFunc;
  bucket: string;
  gapFill?: GapFill;
}
interface TimeseriesQuery {
  streamId: number;
  from?: string;
  until?: string;
  aggregate?: AggregateSpec;
}
interface SeriesPoint {
  t: string;
  v: number;
}
interface QueryResult {
  streamId: number;
  status: number;
  error?: string;
  points: SeriesPoint[];
}
```

Timestamps are RFC3339 **strings**, not `Date` (only `RangeSpec` accepts `Date`).

### Transports

```ts
class HttpTransport implements Transport {
  constructor(opts: HttpTransportOptions);
}
interface HttpTransportOptions {
  baseUrl: string; // no trailing slash
  tokens: TokenProvider;
  fetchImpl?: typeof fetch; // default: global fetch
  retryOnUnauthorized?: boolean; // default: true
}

class DemoTransport implements Transport {
  constructor(dataset: DemoDataset, opts?: { resolutionMs?: number }); // default 3_600_000
}
interface DemoStream {
  id: number;
  name: string;
  unit: string;
}
interface DemoEntity {
  id: number;
  name: string;
  category: Category;
  lat: number;
  long: number;
  streams: DemoStream[];
}
interface DemoDataset {
  tenant: { id: number; name: string };
  entities: DemoEntity[];
  sample(streamId: number, at: Date): number | null;
}
```

### Timeseries

```ts
class TimeseriesQueryBuilder {
  constructor(transport: Transport, streamId: number);
  range(r: RangeSpec): this;
  aggregate(fn: AggFunc, opts: { bucket: string; gapFill?: GapFill }): this;
  execute(): Promise<QueryResult>;
}
interface RangeSpec {
  from?: string | Date;
  until?: string | Date;
  last?: string;
}

type AggFunc = 'avg' | 'min' | 'max' | 'sum';
type GapFill = 'zero' | 'last-value' | 'linear-interpol' | '';
interface Sample {
  t: Date;
  v: number;
}
interface Bucket {
  t: Date;
  v: number;
}

function parseBucket(spec: string): number; // → milliseconds
function aggregate(samples: Sample[], bucketMs: number, fn: AggFunc, gap: GapFill): Bucket[];
```

`range({ last })` accepts `m|h|d|w`; `aggregate({ bucket })` accepts `s|m|h|d`.

### Classification

```ts
type Category =
  | 'parking'
  | 'noise'
  | 'waste'
  | 'garden'
  | 'water'
  | 'energy'
  | 'weather'
  | 'occupancy'
  | 'ble'
  | 'building'
  | 'generic';
const CATEGORIES: Category[];

interface Stream {
  name: string;
  unit: string;
}
interface Datasource {
  name: string;
  streams: Stream[];
}
function classify(ds: Datasource): Category;
```

### Auth

```ts
interface AccessToken {
  accessToken: string;
  expiresAt: number;
  scopes: string[];
  tenantId: number;
}
interface TokenProvider {
  getToken(): Promise<AccessToken>;
  refresh(): Promise<AccessToken>;
}

class StaticTokenProvider implements TokenProvider {
  constructor(token: AccessToken);
}

class PkceTokenProvider implements TokenProvider {
  constructor(opts: PkceTokenProviderOptions);
  beginAuthorization(): Promise<never>; // navigates away
  completeAuthorization(): Promise<AccessToken | null>; // null if not a callback
  getToken(): Promise<AccessToken>; // throws AuthError if unauthenticated
  refresh(): Promise<AccessToken>;
  isAuthenticated(): boolean;
  logout(): void;
}
interface PkceTokenProviderOptions {
  gatewayUrl: string;
  shellUrl: string;
  clientId: string;
  redirectUri: string;
  scopes?: string[];
  elementId?: number;
  expirySkewMs?: number; // default 60_000
  refreshTokenStorage?: 'memory' | StorageLike; // default 'memory'
  crypto?: CryptoLike;
  storage?: StorageLike;
  location?: LocationLike;
  clock?: ClockLike;
  fetchImpl?: typeof fetch;
}

class HostTokenProvider implements TokenProvider {
  constructor(source: HostTokenSource, opts?: HostTokenProviderOptions);
  getToken(): Promise<AccessToken>;
  refresh(): Promise<AccessToken>;
  close(): void;
}
interface HostTokenSource {
  getToken(): Promise<AccessToken>;
  onTokenRevoked?(cb: (reason: string) => void): () => void;
}
interface HostTokenProviderOptions {
  expirySkewMs?: number;
  clock?: ClockLike;
}

class OAuthHttp {
  constructor(opts: OAuthHttpOptions);
  token(body: Record<string, string>): Promise<{ token: AccessToken; refresh?: string }>;
}
interface OAuthHttpOptions {
  gatewayUrl: string;
  fetchImpl?: typeof fetch;
  clock?: ClockLike;
}
interface TokenResponseBody {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
  element_id?: number;
}
```

PKCE primitives and injection seams (mostly for testing):

```ts
function base64UrlEncode(bytes: Uint8Array): string;
function base64UrlDecode(s: string): Uint8Array;
function createCodeVerifier(crypto: CryptoLike): string;
function createCodeChallenge(crypto: CryptoLike, verifier: string): Promise<string>;
function createState(crypto: CryptoLike): string;
function readElementClaim(accessToken: string): number; // decode only — never gate on it

function globalCrypto(): CryptoLike;
function globalSessionStorage(): StorageLike;
function browserLocation(): LocationLike;
function memoryStorage(): StorageLike; // SSR-safe
interface CryptoLike {
  /* … */
}
interface StorageLike {
  /* … */
}
interface LocationLike {
  /* … */
}
interface ClockLike {
  /* … */
}
```

### Context

```ts
type Mode = 'embedded' | 'standalone';
interface ThemeContext {
  mode: 'light' | 'dark';
  primaryColor: string;
}
interface UserContext {
  id: string;
  displayName: string;
  appRole: 'admin' | 'member';
}
interface UrbanOSContext {
  mode: Mode;
  tenant: { id: number; name: string };
  locale: string;
  theme: ThemeContext;
  demo: boolean;
  user: UserContext;
  capabilities: string[];
}
function hasCapability(ctx: UrbanOSContext, cap: string): boolean;
```

Core never _produces_ a context — it comes from the bridge, or you build it.

### Errors

```ts
class UrbanOSError extends Error {
  readonly code: string;
  constructor(message: string, code?: string);
}
class AuthError extends UrbanOSError {
  constructor(message?: string);
} // code 'auth'
class ScopeError extends UrbanOSError {
  constructor(message?: string);
} // code 'scope'
class TenantError extends UrbanOSError {
  constructor(message?: string);
} // code 'tenant'
class ConsentError extends UrbanOSError {
  constructor(message?: string);
} // code 'consent_required'
class GatewayError extends UrbanOSError {
  readonly status: number;
  constructor(message: string, status: number);
}
class BridgeError extends UrbanOSError {
  constructor(message?: string);
} // code 'bridge'
```

### Constants

```ts
const CORE_VERSION: string;
```

## @datamatters-gmbh/urbanos-bridge

```ts
const PROTOCOL_VERSION = 2;
const BRIDGE_VERSION: string;
const HELLO = 'urbanos:hello';
const WELCOME = 'urbanos:welcome';
const TOKEN_GET = 'token.get';
const TOKEN_REVOKED = 'token.revoked';
const CONTEXT_CHANGED = 'context.changed';
const READY = 'ready';
const NAVIGATE = 'navigate';
const ROUTE_CHANGED = 'route.changed';
const RESIZE = 'resize';
const UI_TOAST = 'ui.toast';

interface Envelope {
  urbanos: 2;
  id: string;
  kind: 'req' | 'res' | 'event';
  type: string;
  payload?: unknown;
  error?: { code: string; message: string };
}
interface BridgeContext {
  mode: 'embedded';
  tenant: { id: number; name: string };
  locale: string;
  theme: { mode: 'light' | 'dark'; primaryColor: string };
  demo: boolean;
  user: { id: string; displayName: string; appRole: 'admin' | 'member' };
  capabilities: string[];
}
interface TokenResponse {
  accessToken: string;
  expiresAt: number;
  scopes: string[];
  tenantId: number;
}
interface ToastRequest {
  title: string;
  description?: string;
  color?: string;
}
```

### Channels

```ts
interface Channel {
  post(message: unknown): void;
  onMessage(cb: (message: unknown) => void): () => void;
}
function linkedChannels(): [Channel, Channel];
function windowChannel(opts: WindowChannelOptions): Channel;
interface WindowChannelOptions {
  target: WindowLike;
  targetOrigin: string;
  self?: WindowLike;
}
```

### App side

```ts
function connectApp(
  channel: Channel,
  opts?: { timeoutMs?: number; helloIntervalMs?: number }, // 2000 / 250
): Promise<AppBridge>;

interface AppBridge {
  readonly context: BridgeContext;
  getToken(): Promise<TokenResponse>;
  onContextChanged(cb: (ctx: BridgeContext) => void): () => void;
  onTokenRevoked(cb: (reason: string) => void): () => void;
  onNavigate(cb: (path: string) => void): () => void;
  signalReady(): void;
  notifyRoute(path: string): void;
  requestResize(height: number): void;
  toast(toast: ToastRequest): void;
  close(): void;
}
```

### Host side

```ts
function createHost(channel: Channel, handlers: HostHandlers): Host;

interface HostHandlers {
  context: BridgeContext;
  onTokenRequest(): Promise<TokenResponse>;
}
interface Host {
  emitContext(ctx: BridgeContext): void;
  revokeToken(reason: string): void;
  navigate(path: string): void;
  onReady(cb: () => void): () => void;
  onRouteChanged(cb: (path: string) => void): () => void;
  onResize(cb: (height: number) => void): () => void;
  onToast(cb: (toast: ToastRequest) => void): () => void;
  close(): void;
}
```

## @datamatters-gmbh/urbanos-demo

```ts
const DEMO_VERSION: string;

function seededRng(seed: number): () => number; // Mulberry32, [0, 1)

interface DailyRhythmOptions {
  base: number;
  amplitude: number;
  peakHour?: number; // default 13, UTC
  noise?: number; // default 0; needs rng to apply
  rng?: () => number;
}
function dailyRhythm(opts: DailyRhythmOptions): (at: Date) => number;

interface DefineDemoDatasetInput {
  seed: number; // accepted but unused
  tenant: { id: number; name: string };
  entities: DemoEntity[];
  generators: Record<number, (at: Date) => number | null>; // streamId → sampler
}
function defineDemoDataset(input: DefineDemoDatasetInput): DemoDataset;
```

`DemoDataset`, `DemoEntity`, `DemoStream` are re-exported types from core.

## @datamatters-gmbh/urbanos-manifest

```ts
const MANIFEST_VERSION: string;

const appManifestSchema: ZodObject;
type AppManifest = z.infer<typeof appManifestSchema>;
type AppManifestInput = z.input<typeof appManifestSchema>;

function defineAppManifest(manifest: AppManifestInput): AppManifest; // throws ZodError
function validateAppManifest(
  value: unknown,
): { ok: true; manifest: AppManifest } | { ok: false; errors: string[] };
```

Field-by-field reference: [Publishing](publishing.md#field-reference).

## @datamatters-gmbh/urbanos-vue

```ts
const VUE_BINDINGS_VERSION: string;

interface UrbanOS {
  client: UrbanOSClient;
  context: UrbanOSContext;
}

function createUrbanOS(instance: UrbanOS): { install(app: App): void };
function useUrbanOS(): UrbanOS; // throws if the plugin isn't installed

type AppState = 'loading' | 'ready' | 'empty' | 'error';
interface UseAppState<T> {
  state: Ref<AppState>;
  data: Ref<T | undefined>;
  error: Ref<unknown>;
  reload: () => Promise<void>;
}
function useAppState<T>(
  loader: () => Promise<T>,
  opts?: { isEmpty?: (data: T) => boolean },
): UseAppState<T>;
```

`createUrbanOS` takes an **already-constructed** client and context. `useAppState`
runs its loader immediately.

> This package ships **no `Uos*` components**, despite its package description.

## Not yet implemented

These packages exist and publish, but export only a version constant:

| Package                                | Exports                             |
| -------------------------------------- | ----------------------------------- |
| `@datamatters-gmbh/urbanos-nuxt`       | `NUXT_MODULE_VERSION`               |
| `@datamatters-gmbh/urbanos-tokens`     | `TOKENS_VERSION`                    |
| `@datamatters-gmbh/urbanos-cli`        | `CLI_VERSION` — no commands         |
| `@datamatters-gmbh/create-urbanos-app` | `SCAFFOLDER_VERSION` — no templates |

Workarounds: wire the Vue plugin manually on Nuxt; read theme values from the bridge
context; validate manifests with `validateAppManifest()`; copy
[`examples/minimal-vanilla`](../examples/minimal-vanilla) to start a project.
