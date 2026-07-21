import { expect, test } from 'vitest';
import { MANIFEST_VERSION } from './index';

test('@senseering/urbanos-manifest exposes a version', () => {
  expect(MANIFEST_VERSION).toBe('0.0.0');
});
