import { describe, expect, test } from 'vitest';
import { dailyRhythm, defineDemoDataset, seededRng } from './index';

describe('demo generators', () => {
  test('seededRng is deterministic for a seed', () => {
    const a = seededRng(1337);
    const b = seededRng(1337);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
    expect(seqA[0]).not.toBe(seqA[1]);
  });

  test('dailyRhythm is deterministic in the timestamp', () => {
    const gen = dailyRhythm({ base: 50, amplitude: 10, peakHour: 13 });
    const at = new Date('2026-01-01T13:00:00Z');
    expect(gen(at)).toBe(gen(new Date('2026-01-01T13:00:00Z')));
  });

  test('defineDemoDataset routes samples per stream', () => {
    const ds = defineDemoDataset({
      seed: 1,
      tenant: { id: 42, name: 'Demo' },
      entities: [
        {
          id: 1,
          name: 'P1',
          category: 'parking',
          lat: 0,
          long: 0,
          streams: [{ id: 11, name: 'occ', unit: 'bool' }],
        },
      ],
      generators: { 11: (at) => at.getUTCHours() },
    });
    expect(ds.sample(11, new Date('2026-01-01T05:00:00Z'))).toBe(5);
    expect(ds.sample(99, new Date())).toBeNull();
  });
});
