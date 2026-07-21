import { expect, test } from 'vitest';
import { NUXT_MODULE_VERSION } from './index';

test('@senseering/urbanos-nuxt exposes a version', () => {
  expect(NUXT_MODULE_VERSION).toBe('0.0.0');
});
