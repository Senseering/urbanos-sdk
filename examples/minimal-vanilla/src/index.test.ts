import { expect, test } from 'vitest';
import { run } from './index';

// Proves the SDK works fully offline in demo mode (the Phase 1 exit criterion).
test('runs offline in demo mode', async () => {
  const r = await run();
  expect(r.element).toBe('Demo-Stadt Köln');
  expect(r.parkingCount).toBe(1);
  expect(r.noiseBuckets).toBeGreaterThan(0);
});
