import { expect, test } from 'vitest';
import { CLI_VERSION } from './index';

test('@senseering/urbanos-cli exposes a version', () => {
  expect(CLI_VERSION).toBe('0.0.0');
});
