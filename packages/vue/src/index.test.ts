import { expect, test } from 'vitest';
import { VUE_BINDINGS_VERSION } from './index';

test('@senseering/urbanos-vue exposes a version', () => {
  expect(VUE_BINDINGS_VERSION).toBe('0.0.0');
});
