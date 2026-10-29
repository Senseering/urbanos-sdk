import { GatewayError } from '../errors/errors.js';

export class ReadRequestError extends GatewayError {
  constructor(
    message: string,
    status: number,
    public readonly retryAfter?: number,
  ) {
    super(message, status);
  }
}
export interface ReadFetchOptions {
  fetchImpl?: typeof fetch;
  signal?: () => AbortSignal | undefined;
  timeoutMs?: number;
}
const MAX_BYTES = 8 * 1024 * 1024;
function abortReason(signal: AbortSignal): Error | undefined {
  if (!signal.aborted) return undefined;
  const reason: unknown = signal.reason;
  return reason instanceof Error || reason instanceof DOMException
    ? reason
    : new DOMException('Read cancelled', 'AbortError');
}
function requestAbortScope(timeoutMs: number, sources: AbortSignal[]) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0)
    throw new RangeError('timeoutMs must be positive');
  const controller = new AbortController();
  let expired = false;
  const listeners: Array<() => void> = [];
  for (const source of sources) {
    const cancel = () => controller.abort(abortReason(source));
    if (source.aborted) {
      cancel();
      break;
    }
    source.addEventListener('abort', cancel, { once: true });
    listeners.push(() => source.removeEventListener('abort', cancel));
  }
  const timer = setTimeout(() => {
    if (!controller.signal.aborted) {
      expired = true;
      controller.abort(new DOMException('Read timed out', 'TimeoutError'));
    }
  }, timeoutMs);
  return {
    signal: controller.signal,
    expired: () => expired,
    cleanup: () => {
      clearTimeout(timer);
      for (const remove of listeners) remove();
    },
  };
}
/** Bound bodies before JSON decoding. Do not automatically retry throttled reads. */
export function createReadFetch(options: ReadFetchOptions = {}): typeof fetch {
  const send = options.fetchImpl ?? fetch;
  let active = 0;
  const waiting: Array<{ grant: () => void }> = [];
  const acquire = (signal: AbortSignal): Promise<() => void> => {
    const aborted = abortReason(signal);
    if (aborted) return Promise.reject(aborted);
    const release = () => {
      const next = waiting.shift();
      if (next) next.grant();
      else active--;
    };
    if (active < 4) {
      active++;
      return Promise.resolve(release);
    }
    if (waiting.length >= 128)
      return Promise.reject(
        new ReadRequestError('Too many pending reads; reduce concurrency', 429, 1),
      );
    return new Promise((resolve, reject) => {
      const entry = {
        grant: () => {
          signal.removeEventListener('abort', cancelled);
          resolve(release);
        },
      };
      const cancelled = () => {
        const index = waiting.indexOf(entry);
        if (index >= 0) waiting.splice(index, 1);
        reject(abortReason(signal) ?? new DOMException('Read cancelled', 'AbortError'));
      };
      waiting.push(entry);
      signal.addEventListener('abort', cancelled, { once: true });
    });
  };
  return async (input, init) => {
    const scope = requestAbortScope(
      options.timeoutMs ?? 15_000,
      [
        init?.signal,
        options.signal?.(),
        input instanceof Request ? input.signal : undefined,
      ].filter((item): item is AbortSignal => !!item),
    );
    const signal = scope.signal;
    let release: (() => void) | undefined;

    try {
      release = await acquire(signal);
      const aborted = abortReason(signal);
      if (aborted) throw aborted;
      let response: Response;
      try {
        response = await send(input, {
          ...init,
          signal,
          credentials: 'omit',
          cache: 'no-store',
          redirect: 'error',
        });
      } catch {
        const aborted = abortReason(signal);
        if (aborted) {
          if (aborted.name === 'TimeoutError')
            throw new ReadRequestError('Read timed out; reduce the time window or batch size', 504);
          throw aborted;
        }
        throw new ReadRequestError(
          'Gateway request failed; check connectivity and retry later',
          502,
        );
      }
      const limit = response.ok ? MAX_BYTES : 64 * 1024;
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      const chunks: string[] = [];
      let bytes = 0;
      try {
        if (Number(response.headers.get('content-length')) > limit)
          throw new ReadRequestError(
            'Response exceeds the read budget; reduce the time window or batch size',
            413,
          );
        if (reader)
          for (;;) {
            const part = await reader.read();
            if (part.done) break;
            bytes += part.value.byteLength;
            if (bytes > limit)
              throw new ReadRequestError(
                'Response exceeds the read budget; reduce the time window or batch size',
                413,
              );
            chunks.push(decoder.decode(part.value, { stream: true }));
          }
        chunks.push(decoder.decode());
      } catch (error) {
        if (abortReason(signal)?.name === 'TimeoutError')
          throw new ReadRequestError('Read timed out; reduce the time window or batch size', 504);
        throw error;
      } finally {
        if (reader) {
          await reader.cancel().catch(() => {});
          reader.releaseLock();
        }
      }
      const body = chunks.join('');
      if (!response.ok && response.status !== 401 && response.status !== 404) {
        let detail = `Gateway responded ${response.status}`;
        try {
          const problem: unknown = JSON.parse(body);
          if (
            problem &&
            typeof problem === 'object' &&
            'detail' in problem &&
            typeof problem.detail === 'string'
          )
            detail = problem.detail.slice(0, 500);
        } catch {
          /* Preserve a useful status when the upstream does not return JSON. */
        }
        const retry = response.headers.get('retry-after');
        const seconds =
          retry && /^\d+$/.test(retry)
            ? Number(retry)
            : retry
              ? Math.max(0, Math.ceil((Date.parse(retry) - Date.now()) / 1000))
              : undefined;
        throw new ReadRequestError(
          detail,
          response.status,
          Number.isFinite(seconds) ? seconds : undefined,
        );
      }
      return new Response(response.status === 204 || response.status === 205 ? null : body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (error) {
      if (scope.expired())
        throw new ReadRequestError('Read timed out; reduce the time window or batch size', 504);
      throw error;
    } finally {
      release?.();
      scope.cleanup();
    }
  };
}
