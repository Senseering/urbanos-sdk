import { expect, test } from 'vitest';
import { BRIDGE_VERSION } from './index';

test('@senseering/urbanos-bridge exposes a version', () => {
  expect(BRIDGE_VERSION).toBe('0.0.0');
});
