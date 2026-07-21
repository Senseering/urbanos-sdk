/** A duplex message channel. The window/MessagePort adapter and the in-memory
 * test channel both implement it, so the protocol is testable without a DOM. */

export interface Channel {
  post(message: unknown): void;
  onMessage(cb: (message: unknown) => void): () => void;
}

/** Two connected in-memory channels (for tests and same-process wiring). */
export function linkedChannels(): [Channel, Channel] {
  const aListeners = new Set<(m: unknown) => void>();
  const bListeners = new Set<(m: unknown) => void>();
  const a: Channel = {
    post: (m) => queueMicrotask(() => bListeners.forEach((cb) => cb(m))),
    onMessage: (cb) => {
      aListeners.add(cb);
      return () => aListeners.delete(cb);
    },
  };
  const b: Channel = {
    post: (m) => queueMicrotask(() => aListeners.forEach((cb) => cb(m))),
    onMessage: (cb) => {
      bListeners.add(cb);
      return () => bListeners.delete(cb);
    },
  };
  return [a, b];
}

// ---------------- Window (postMessage) adapter ----------------
//
// The real browser channel: the host talks to `iframe.contentWindow`, the guest
// to `window.parent`. Defined structurally (WindowLike/MessageEventLike) so the
// package stays DOM-lib-free and testable without a real DOM.

export interface MessageEventLike {
  data: unknown;
  origin: string;
  source: unknown;
}

export interface WindowLike {
  postMessage(message: unknown, targetOrigin: string): void;
  addEventListener(type: 'message', listener: (event: MessageEventLike) => void): void;
  removeEventListener(type: 'message', listener: (event: MessageEventLike) => void): void;
}

export interface WindowChannelOptions {
  /** Window to post to: `iframe.contentWindow` (host) or `window.parent` (guest). */
  target: WindowLike;
  /** The exact origin to post to AND accept from. Never `'*'` — this is the
   * security boundary (both-sides origin validation). */
  targetOrigin: string;
  /** Window to listen on; defaults to the global `window`. */
  self?: WindowLike;
}

function globalWindow(): WindowLike {
  const w = (globalThis as { window?: WindowLike }).window;
  if (!w) throw new Error('windowChannel: no global window; pass opts.self');
  return w;
}

/**
 * A {@link Channel} over `window.postMessage`. Every post targets an explicit
 * origin; every inbound message is rejected unless its `origin` matches
 * `targetOrigin` and (when the runtime provides it) its `source` is the target
 * window — closing cross-frame spoofing.
 */
export function windowChannel(opts: WindowChannelOptions): Channel {
  const listenOn = opts.self ?? globalWindow();
  return {
    post: (message) => opts.target.postMessage(message, opts.targetOrigin),
    onMessage: (cb) => {
      const listener = (event: MessageEventLike): void => {
        if (event.origin !== opts.targetOrigin) return;
        if (event.source != null && event.source !== opts.target) return;
        cb(event.data);
      };
      listenOn.addEventListener('message', listener);
      return () => listenOn.removeEventListener('message', listener);
    },
  };
}
