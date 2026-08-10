import { describe, expect, test } from 'vitest';
import { UrbanOSClient } from './client';
import { DemoTransport, type DemoDataset } from './demo-transport';
import { StaticTokenProvider } from '../auth/token-provider';

// A tiny deterministic dataset: one parking sensor whose value is the hour of day.
const dataset: DemoDataset = {
  tenant: { id: 42, name: 'Demo-Stadt Köln' },
  entities: [
    {
      id: 1,
      name: 'Parkplatz P1',
      category: 'parking',
      lat: 50.94,
      long: 6.95,
      streams: [{ id: 11, name: 'occupied', unit: 'bool' }],
    },
  ],
  sample: (_streamId, at) => at.getUTCHours(),
};

describe('UrbanOSClient over DemoTransport', () => {
  test('reads the element and datasources', async () => {
    const client = new UrbanOSClient(new DemoTransport(dataset));
    expect((await client.element()).name).toBe('Demo-Stadt Köln');
    const ds = await client.datasources({ category: 'parking' });
    expect(ds).toHaveLength(1);
    expect(ds[0]!.streams[0]!.id).toBe(11);
  });

  test('runs a server-shaped aggregated query through the local engine', async () => {
    const client = new UrbanOSClient(new DemoTransport(dataset));
    const from = '2026-01-01T00:00:00Z';
    const until = '2026-01-01T05:00:00Z';
    const res = await client
      .timeseries(11)
      .range({ from, until })
      .aggregate('avg', { bucket: '1h', gapFill: 'zero' })
      .execute();

    expect(res.status).toBe(200);
    // Six hourly buckets 00:00..05:00, each avg of the single hourly sample = the hour.
    expect(res.points).toHaveLength(6);
    expect(res.points[0]).toEqual({ t: '2026-01-01T00:00:00.000Z', v: 0 });
    expect(res.points[3]).toEqual({ t: '2026-01-01T03:00:00.000Z', v: 3 });
  });

  test('unknown stream yields a per-query 404', async () => {
    const client = new UrbanOSClient(new DemoTransport(dataset));
    const res = await client.timeseries(9999).range({ last: '24h' }).execute();
    expect(res.status).toBe(404);
  });

  test('storage round-trips', async () => {
    const client = new UrbanOSClient(new DemoTransport(dataset));
    await client.storage.put('prefs', { theme: 'dark' });
    expect(await client.storage.get('prefs')).toEqual({ theme: 'dark' });
  });

  test('mandateId() surfaces the token mandate when a provider is wired', async () => {
    const tokens = new StaticTokenProvider({
      accessToken: 'scoped-jwt',
      expiresAt: Date.now() + 900_000,
      scopes: ['element:read'],
      tenantId: 42,
      mandateId: 7,
    });
    const client = new UrbanOSClient(new DemoTransport(dataset), { tokens });
    expect(await client.mandateId()).toBe(7);
  });

  test('mandateId() is undefined without a provider or without a token mandate', async () => {
    const noProvider = new UrbanOSClient(new DemoTransport(dataset));
    expect(await noProvider.mandateId()).toBeUndefined();

    const noMandate = new UrbanOSClient(new DemoTransport(dataset), {
      tokens: new StaticTokenProvider({
        accessToken: 'scoped-jwt',
        expiresAt: Date.now() + 900_000,
        scopes: [],
        tenantId: 42,
      }),
    });
    expect(await noMandate.mandateId()).toBeUndefined();
  });
});
