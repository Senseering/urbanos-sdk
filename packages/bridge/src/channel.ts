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
