import { expect, test } from 'vitest';
import { TOKENS_VERSION } from './index';

test('@datamatters-gmbh/urbanos-tokens exposes a version', () => {
  expect(TOKENS_VERSION).toBe('0.0.0');
});
