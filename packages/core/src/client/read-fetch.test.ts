import { describe, expect, it } from 'vitest';
import { createReadFetch, ReadRequestError } from './read-fetch';
import { GatewayError } from '../errors/errors';

describe('bounded read fetch', () => {
  it('preserves GatewayError compatibility and exposes actionable throttling without retrying', async () => {
    let calls = 0;
    const read = createReadFetch({
      fetchImpl: () => {
        calls++;
        return Promise.resolve(
          new Response(JSON.stringify({ detail: 'Reduce concurrency' }), {
            status: 429,
            headers: { 'Retry-After': '7' },
          }),
        );
      },
    });
    try {
      await read('https://example.test/v1/element');
      throw new Error('expected throttle');
    } catch (error) {
      expect(error).toBeInstanceOf(GatewayError);
      expect(error).toBeInstanceOf(ReadRequestError);
      expect(error).toMatchObject({
        name: 'GatewayError',
        status: 429,
        message: 'Reduce concurrency',
        retryAfter: 7,
      });
    }
    expect(calls).toBe(1);
  });
  it('caps bodies before decoding and cancels an oversized stream', async () => {
    let cancelled = false;
    let pulls = 0;
    const read = createReadFetch({
      fetchImpl: () =>
        Promise.resolve(
          new Response(
            new ReadableStream({
              pull(controller) {
                pulls++;
                controller.enqueue(new Uint8Array(1024 * 1024));
              },
              cancel() {
                cancelled = true;
              },
            }),
          ),
        ),
    });
    await expect(read('https://example.test')).rejects.toMatchObject({ status: 413 });
    expect(cancelled).toBe(true);
    expect(pulls).toBeLessThan(12);
  });
  it('bounds concurrency across simultaneous batches and lets cancellation leave the queue', async () => {
    let active = 0,
      max = 0;
    const releases: Array<() => void> = [];
    const read = createReadFetch({
      fetchImpl: async () => {
        active++;
        max = Math.max(max, active);
        await new Promise<void>((resolve) => releases.push(resolve));
        active--;
        return Promise.resolve(new Response('{}'));
      },
    });
    const calls = Array.from({ length: 8 }, () => read('https://example.test'));
    await Promise.resolve();
    await Promise.resolve();
    expect(max).toBe(4);
    releases.splice(0).forEach((resolve) => resolve());
    for (let i = 0; i < 30 && releases.length < 4; i++)
      await new Promise((resolve) => setTimeout(resolve, 0));
    releases.splice(0).forEach((resolve) => resolve());
    await Promise.all(calls);
    expect(max).toBe(4);
  });
  it('passes cancellation and prevents redirects, cookies and cached protected responses', async () => {
    const controller = new AbortController();
    let init: RequestInit | undefined;
    const read = createReadFetch({
      signal: () => controller.signal,
      fetchImpl: (_, options) => {
        init = options;
        return Promise.resolve(new Response('{}'));
      },
    });
    await read('https://example.test');
    expect(init).toMatchObject({ credentials: 'omit', cache: 'no-store', redirect: 'error' });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });
});

it('cancels an in-flight fetch and reports a bounded deadline without native AbortSignal helpers', async () => {
  const cancelled = new AbortController();
  const send: typeof fetch = (_, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener(
        'abort',
        () => reject(new DOMException('Aborted', 'AbortError')),
        { once: true },
      );
    });
  const read = createReadFetch({ signal: () => cancelled.signal, fetchImpl: send });
  const pending = read('https://example.test');
  await Promise.resolve();
  await Promise.resolve();
  cancelled.abort();
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  const timed = createReadFetch({ timeoutMs: 5, fetchImpl: send });
  await expect(timed('https://example.test')).rejects.toMatchObject({ status: 504 });
});
