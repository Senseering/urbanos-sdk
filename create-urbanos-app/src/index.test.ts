import { expect, test } from 'vitest';
import { SCAFFOLDER_VERSION } from './index';

test('@datamatters-gmbh/create-urbanos-app exposes a version', () => {
  expect(SCAFFOLDER_VERSION).toBe('0.0.0');
});
