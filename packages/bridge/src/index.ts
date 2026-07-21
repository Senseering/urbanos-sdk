/**
 * @senseering/urbanos-bridge
 *
 * Embed protocol v2: a host (the UDP shell) and a guest app exchange a scoped
 * app token + context over a duplex channel. The user session never crosses the
 * bridge. Zero dependencies, framework-agnostic. See docs/v2-migration/04-sdk.md §2.
 */
import type { Channel } from './channel';
import {
  CONTEXT_CHANGED,
  HELLO,
  PROTOCOL_VERSION,
  TOKEN_GET,
  TOKEN_REVOKED,
  WELCOME,
  type BridgeContext,
  type Envelope,
  type TokenResponse,
} from './protocol';

export const BRIDGE_VERSION = '0.1.0';

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

// ---------------- Host (shell) side ----------------

export interface HostHandlers {
  context: BridgeContext;
  onTokenRequest(): Promise<TokenResponse>;
}

export interface Host {
  emitContext(ctx: BridgeContext): void;
  revokeToken(reason: string): void;
  close(): void;
}

export function createHost(channel: Channel, handlers: HostHandlers): Host {
  let ctx = handlers.context;
  const off = channel.onMessage((raw) => {
    if (!isEnvelope(raw)) return;
    const env = raw;
    if (env.type === HELLO) {
      channel.post(
        envelope('event', WELCOME, { payload: { version: PROTOCOL_VERSION, context: ctx } }),
      );
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
    close() {
      off();
    },
  };
}

// ---------------- App (guest) side ----------------

export interface AppBridge {
  readonly context: BridgeContext;
  getToken(): Promise<TokenResponse>;
  onContextChanged(cb: (ctx: BridgeContext) => void): () => void;
  onTokenRevoked(cb: (reason: string) => void): () => void;
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
        onContextChanged(cb) {
          contextListeners.add(cb);
          return () => contextListeners.delete(cb);
        },
        onTokenRevoked(cb) {
          revokeListeners.add(cb);
          return () => revokeListeners.delete(cb);
        },
        close() {
          off();
        },
      };
    }
  });
}
