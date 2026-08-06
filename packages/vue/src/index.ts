/**
 * @datamatters-gmbh/urbanos-vue
 *
 * Vue 3 bindings over the core client: a plugin that provides the client +
 * context, useUrbanOS() to consume them, and useAppState() — the standard
 * loading | ready | empty | error contract every app screen routes through.
 * See docs/getting-started.md for the wiring.
 */
import { type App, type InjectionKey, type Ref, inject, ref, shallowRef } from 'vue';
import type { UrbanOSClient, UrbanOSContext } from '@datamatters-gmbh/urbanos-core';

export const VUE_BINDINGS_VERSION = '0.1.0';

export interface UrbanOS {
  client: UrbanOSClient;
  context: UrbanOSContext;
}

const URBANOS_KEY: InjectionKey<UrbanOS> = Symbol('urbanos');

/** Vue plugin: `app.use(createUrbanOS({ client, context }))`. */
export function createUrbanOS(instance: UrbanOS): { install(app: App): void } {
  return {
    install(app: App) {
      app.provide(URBANOS_KEY, instance);
    },
  };
}

/** Consume the client + context inside setup(). */
export function useUrbanOS(): UrbanOS {
  const u = inject(URBANOS_KEY);
  if (!u) throw new Error('useUrbanOS() requires the urbanOS plugin (app.use(createUrbanOS(...)))');
  return u;
}

export type AppState = 'loading' | 'ready' | 'empty' | 'error';

export interface UseAppState<T> {
  state: Ref<AppState>;
  data: Ref<T | undefined>;
  error: Ref<unknown>;
  reload: () => Promise<void>;
}

/** Run a loader and expose the five-state contract. `isEmpty` distinguishes an
 * empty-but-successful result (e.g. no matching sensors) from a ready one. */
export function useAppState<T>(
  loader: () => Promise<T>,
  opts?: { isEmpty?: (data: T) => boolean },
): UseAppState<T> {
  const state = ref<AppState>('loading');
  const data = shallowRef<T>();
  const error = ref<unknown>();

  const reload = async (): Promise<void> => {
    state.value = 'loading';
    error.value = undefined;
    try {
      const result = await loader();
      data.value = result;
      state.value = opts?.isEmpty?.(result) ? 'empty' : 'ready';
    } catch (e) {
      error.value = e;
      state.value = 'error';
    }
  };

  void reload();
  return { state, data, error, reload };
}
