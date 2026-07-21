import { expect, test } from 'vitest';
import { TOKENS_VERSION } from './index';

test('@senseering/urbanos-tokens exposes a version', () => {
  expect(TOKENS_VERSION).toBe('0.0.0');
});
