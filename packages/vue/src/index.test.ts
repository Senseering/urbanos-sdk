import { describe, expect, test } from 'vitest';
import { createApp } from 'vue';
import type { UrbanOSClient, UrbanOSContext } from '@senseering/urbanos-core';
import { createUrbanOS, useAppState, useUrbanOS, type UrbanOS } from './index';

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('useAppState', () => {
  test('resolves to ready with data', async () => {
    const s = useAppState(() => Promise.resolve([1, 2, 3]));
    await tick();
    expect(s.state.value).toBe('ready');
    expect(s.data.value).toEqual([1, 2, 3]);
  });

  test('resolves to empty via isEmpty', async () => {
    const s = useAppState(() => Promise.resolve([] as number[]), {
      isEmpty: (d) => d.length === 0,
    });
    await tick();
    expect(s.state.value).toBe('empty');
  });

  test('captures errors', async () => {
    const s = useAppState(() => Promise.reject(new Error('boom')));
    await tick();
    expect(s.state.value).toBe('error');
    expect((s.error.value as Error).message).toBe('boom');
  });
});

describe('plugin', () => {
  test('useUrbanOS returns the provided instance', () => {
    const instance: UrbanOS = {
      client: {} as unknown as UrbanOSClient,
      context: { demo: true } as unknown as UrbanOSContext,
    };
    const app = createApp({ render: () => null });
    app.use(createUrbanOS(instance));
    const got = app.runWithContext(() => useUrbanOS());
    expect(got).toBe(instance);
  });
});
