import { expect, test } from 'vitest';
import { CORE_VERSION } from './index';

test('@senseering/urbanos-core exposes a version', () => {
  expect(CORE_VERSION).toBe('0.0.0');
});
