import { describe, expect, test } from 'vitest';
import aggFile from '../__fixtures__/aggregation.cases.json';
import { aggregate, parseBucket, type AggFunc, type GapFill } from './aggregate';

interface AggCase {
  id: string;
  query: { aggregate: { function: string; bucket: string; gapFill?: string } };
  input: { samples: { t: string; v: number }[] };
  expected: { buckets: { t: string; v: number }[] };
}

const cases = (aggFile as { cases: AggCase[] }).cases;

// The identical fixtures run in the Go gateway (internal/timeseries). When both
// pass, demo mode matches production aggregation exactly.
describe('aggregation conformance (Go↔TS parity)', () => {
  for (const c of cases) {
    test(c.id, () => {
      const samples = c.input.samples.map((s) => ({ t: new Date(s.t), v: s.v }));
      const got = aggregate(
        samples,
        parseBucket(c.query.aggregate.bucket),
        c.query.aggregate.function as AggFunc,
        (c.query.aggregate.gapFill ?? '') as GapFill,
      );
      expect(got.length).toBe(c.expected.buckets.length);
      got.forEach((b, i) => {
        const want = c.expected.buckets[i]!;
        expect(b.t.getTime()).toBe(new Date(want.t).getTime());
        expect(b.v).toBeCloseTo(want.v, 9);
      });
    });
  }
});
