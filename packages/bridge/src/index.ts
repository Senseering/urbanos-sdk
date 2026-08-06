/**
 * @senseering/urbanos-bridge
 *
 * Embed protocol v2: a host (the urbanOS shell) and a guest app exchange a
 * scoped app token + context over a duplex channel. The user session never
 * crosses the bridge. Zero dependencies, framework-agnostic.
 * See docs/embedding.md for the developer-facing guide.
 */
import type { Channel } from './channel';
import {
  CONTEXT_CHANGED,
  HELLO,
  NAVIGATE,
  PROTOCOL_VERSION,
  READY,
  RESIZE,
  ROUTE_CHANGED,
  TOKEN_GET,
  TOKEN_REVOKED,
  UI_TOAST,
  WELCOME,
  type BridgeContext,
  type Envelope,
  type ToastRequest,
  type TokenResponse,
} from './protocol';

export const BRIDGE_VERSION = '0.3.0';

export * from './protocol';
export * from './channel';

function newId(): string {
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

function isEnvelope(m: unknown): m is Envelope {
  return (
    typeof m === 'object' && m !== null && (m as { urbanos?: unknown }).urbanos === PROTOCOL_VERSION
  );
}

function envelope(kind: Envelope['kind'], type: string, extra?: Partial<Envelope>): Envelope {
  return { urbanos: PROTOCOL_VERSION, id: extra?.id ?? newId(), kind, type, ...extra };
}

type Unsub = () => void;
function subscribe<T>(set: Set<(v: T) => void>, cb: (v: T) => void): Unsub {
  set.add(cb);
  return () => set.delete(cb);
}

// ---------------- Host (shell) side ----------------

export interface HostHandlers {
  context: BridgeContext;
  onTokenRequest(): Promise<TokenResponse>;
}

export interface Host {
  emitContext(ctx: BridgeContext): void;
  revokeToken(reason: string): void;
  /** Deep-link the embedded app to a path. */
  navigate(path: string): void;
  /** The guest finished mounting and connecting. */
  onReady(cb: () => void): Unsub;
  /** The guest's internal route changed (mirror it into the shell URL). */
  onRouteChanged(cb: (path: string) => void): Unsub;
  /** The guest requested a content height (capability-gated by the host). */
  onResize(cb: (height: number) => void): Unsub;
  /** The guest asked the shell to show a toast. */
  onToast(cb: (toast: ToastRequest) => void): Unsub;
  close(): void;
}

export function createHost(channel: Channel, handlers: HostHandlers): Host {
  let ctx = handlers.context;
  const readyListeners = new Set<() => void>();
  const routeListeners = new Set<(path: string) => void>();
  const resizeListeners = new Set<(height: number) => void>();
  const toastListeners = new Set<(toast: ToastRequest) => void>();

  const off = channel.onMessage((raw) => {
    if (!isEnvelope(raw)) return;
    const env = raw;
    if (env.type === HELLO) {
      channel.post(
        envelope('event', WELCOME, { payload: { version: PROTOCOL_VERSION, context: ctx } }),
      );
      return;
    }
    if (env.type === READY) {
      readyListeners.forEach((cb) => cb());
      return;
    }
    if (env.type === ROUTE_CHANGED) {
      const path = (env.payload as { path: string }).path;
      routeListeners.forEach((cb) => cb(path));
      return;
    }
    if (env.type === RESIZE) {
      const height = (env.payload as { height: number }).height;
      resizeListeners.forEach((cb) => cb(height));
      return;
    }
    if (env.type === UI_TOAST) {
      const toast = env.payload as ToastRequest;
      toastListeners.forEach((cb) => cb(toast));
      return;
    }
    if (env.kind === 'req' && env.type === TOKEN_GET) {
      handlers.onTokenRequest().then(
        (token) => channel.post(envelope('res', TOKEN_GET, { id: env.id, payload: token })),
        (err: unknown) =>
          channel.post(
            envelope('res', TOKEN_GET, {
              id: env.id,
              error: { code: 'token_error', message: String(err) },
            }),
          ),
      );
    }
  });

  return {
    emitContext(next) {
      ctx = next;
      channel.post(envelope('event', CONTEXT_CHANGED, { payload: next }));
    },
    revokeToken(reason) {
      channel.post(envelope('event', TOKEN_REVOKED, { payload: { reason } }));
    },
    navigate(path) {
      channel.post(envelope('event', NAVIGATE, { payload: { path } }));
    },
    onReady: (cb) => subscribe(readyListeners, cb),
    onRouteChanged: (cb) => subscribe(routeListeners, cb),
    onResize: (cb) => subscribe(resizeListeners, cb),
    onToast: (cb) => subscribe(toastListeners, cb),
    close() {
      off();
    },
  };
}

// ---------------- App (guest) side ----------------

export interface AppBridge {
  readonly context: BridgeContext;
  getToken(): Promise<TokenResponse>;
  onContextChanged(cb: (ctx: BridgeContext) => void): Unsub;
  onTokenRevoked(cb: (reason: string) => void): Unsub;
  /** Deep-links pushed by the host (mirror them into the app router). */
  onNavigate(cb: (path: string) => void): Unsub;
  /** Signal the app has mounted + connected. */
  signalReady(): void;
  /** Mirror the app's current route into the shell URL. */
  notifyRoute(path: string): void;
  /** Ask the host to size the iframe to `height` px (capability-gated). */
  requestResize(height: number): void;
  /** Ask the shell to show a toast. */
  toast(toast: ToastRequest): void;
  close(): void;
}

export function connectApp(
  channel: Channel,
  opts?: { timeoutMs?: number; helloIntervalMs?: number },
): Promise<AppBridge> {
  const timeoutMs = opts?.timeoutMs ?? 2000;
  const helloIntervalMs = opts?.helloIntervalMs ?? 250;

  return new Promise<AppBridge>((resolve, reject) => {
    let context: BridgeContext | undefined;
    const timers: {
      hello?: ReturnType<typeof setInterval>;
      timer?: ReturnType<typeof setTimeout>;
    } = {};
    const pending = new Map<
      string,
      { resolve: (t: TokenResponse) => void; reject: (e: Error) => void }
    >();
    const contextListeners = new Set<(c: BridgeContext) => void>();
    const revokeListeners = new Set<(r: string) => void>();
    const navigateListeners = new Set<(p: string) => void>();

    const off = channel.onMessage((raw) => {
      if (!isEnvelope(raw)) return;
      const env = raw;
      if (env.type === WELCOME && !context) {
        context = (env.payload as { context: BridgeContext }).context;
        clearTimeout(timers.timer);
        clearInterval(timers.hello);
        resolve(makeBridge());
        return;
      }
      if (env.type === CONTEXT_CHANGED) {
        context = env.payload as BridgeContext;
        contextListeners.forEach((cb) => cb(context!));
        return;
      }
      if (env.type === TOKEN_REVOKED) {
        const reason = (env.payload as { reason: string }).reason;
        revokeListeners.forEach((cb) => cb(reason));
        return;
      }
      if (env.type === NAVIGATE) {
        const path = (env.payload as { path: string }).path;
        navigateListeners.forEach((cb) => cb(path));
        return;
      }
      if (env.kind === 'res' && env.type === TOKEN_GET) {
        const p = pending.get(env.id);
        if (!p) return;
        pending.delete(env.id);
        if (env.error) p.reject(new Error(env.error.message));
        else p.resolve(env.payload as TokenResponse);
      }
    });

    const sendHello = (): void =>
      channel.post(envelope('event', HELLO, { payload: { versions: [PROTOCOL_VERSION] } }));
    sendHello();
    timers.hello = setInterval(sendHello, helloIntervalMs);
    timers.timer = setTimeout(() => {
      clearInterval(timers.hello);
      off();
      reject(new Error('bridge: host did not answer'));
    }, timeoutMs);

    function makeBridge(): AppBridge {
      return {
        get context() {
          return context!;
        },
        getToken() {
          return new Promise<TokenResponse>((res, rej) => {
            const id = newId();
            pending.set(id, { resolve: res, reject: rej });
            channel.post(envelope('req', TOKEN_GET, { id }));
          });
        },
        onContextChanged: (cb) => subscribe(contextListeners, cb),
        onTokenRevoked: (cb) => subscribe(revokeListeners, cb),
        onNavigate: (cb) => subscribe(navigateListeners, cb),
        signalReady() {
          channel.post(envelope('event', READY));
        },
        notifyRoute(path) {
          channel.post(envelope('event', ROUTE_CHANGED, { payload: { path } }));
        },
        requestResize(height) {
          channel.post(envelope('event', RESIZE, { payload: { height } }));
        },
        toast(toast) {
          channel.post(envelope('event', UI_TOAST, { payload: toast }));
        },
        close() {
          off();
        },
      };
    }
  });
}
