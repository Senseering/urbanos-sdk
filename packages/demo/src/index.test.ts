import { expect, test } from 'vitest';
import { DEMO_VERSION } from './index';

test('@senseering/urbanos-demo exposes a version', () => {
  expect(DEMO_VERSION).toBe('0.0.0');
});
