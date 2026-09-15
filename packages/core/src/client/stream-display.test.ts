import { describe, expect, test } from 'vitest';
import file from '../__fixtures__/stream-display.cases.json';
import { streamDisplayUnit, streamDisplayValue } from './stream-display.js';
import { DemoTransport } from './demo-transport.js';
import { HttpTransport } from './http-transport.js';
import { StaticTokenProvider } from '../auth/token-provider.js';

describe('legacy display conformance (Go/TS)', () => {
  for (const c of file.cases) {
    test(c.id, () => {
      expect(streamDisplayUnit(c.name, c.storedUnit)).toBe(c.expectedUnit);
      expect(streamDisplayValue(c.name, c.value)).toBeCloseTo(c.expectedValue, 9);
    });
  }
  test('unknown property names cannot resolve prototype values', () => {
    expect(streamDisplayUnit('constructor', '')).toBe('');
    expect(streamDisplayUnit('__proto__', '')).toBe('');
  });
});

test('demo converts once after aggregation without changing the dataset', async () => {
  const start = '2026-01-01T00:00:00Z';
  const streams = [
    { id: 1, name: 'pressure', unit: '' },
    { id: 2, name: 'uv', unit: '' },
    { id: 3, name: 'co2', unit: '' },
  ];
  const demo = new DemoTransport(
    {
      tenant: { id: 42, name: 'Demo' },
      entities: [{ id: 1, name: 'Unknown model', category: 'weather', lat: 0, long: 0, streams }],
      sample: (id, at) =>
        id === 1 ? (at.getUTCMinutes() === 0 ? 9999 : 10001) : id === 2 ? 454 : 800,
    },
    { resolutionMs: 60000 },
  );
  expect((await demo.listDatasources())[0]?.streams.map((s) => s.unit)).toEqual(['Pa', '', 'ppm']);
  const queries = [
    { streamId: 1, from: start, until: '2026-01-01T00:01:00Z' },
    { streamId: 2, from: start, until: start },
    {
      streamId: 1,
      from: start,
      until: '2026-01-01T00:01:00Z',
      aggregate: { function: 'avg' as const, bucket: '1h' },
    },
  ];
  for (let i = 0; i < 2; i++) {
    const results = await demo.queryTimeseries(queries);
    expect(results[0]?.points.map((p) => p.v)).toEqual([999900, 10001]);
    expect(results[1]?.points.map((p) => p.v)).toEqual([2]);
    expect(results[2]?.points.map((p) => p.v)).toEqual([10000]);
  }
  expect(streams.every((s) => s.unit === '')).toBe(true);
});

test('HTTP passes through already converted gateway values', async () => {
  const http = new HttpTransport({
    baseUrl: 'https://gateway.example',
    tokens: new StaticTokenProvider({
      accessToken: 'test',
      expiresAt: Date.now() + 60000,
      tenantId: 42,
      scopes: [],
    }),
    fetchImpl: () =>
      Promise.resolve(
        Response.json({
          results: [{ stream_id: 2, status: 200, points: [{ t: '2026-01-01T00:00:00Z', v: 2 }] }],
        }),
      ),
  });
  expect((await http.queryTimeseries([{ streamId: 2 }]))[0]?.points[0]?.v).toBe(2);
});
