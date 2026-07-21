import { describe, expect, test } from 'vitest';
import clsFile from '../__fixtures__/classification.cases.json';
import { classify } from './classify';

interface ClsCase {
  id: string;
  input: { name: string; streams: { name: string; unit: string }[] };
  expected: { category: string };
}

const cases = (clsFile as { cases: ClsCase[] }).cases;

describe('classification conformance (Go↔TS parity)', () => {
  for (const c of cases) {
    test(c.id, () => {
      expect(classify(c.input)).toBe(c.expected.category);
    });
  }
});
