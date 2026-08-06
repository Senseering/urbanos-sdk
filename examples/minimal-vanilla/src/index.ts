/**
 * The smallest urbanOS app. It builds a deterministic demo dataset and queries
 * it through the SDK client — no gateway, no network, no auth. The exact same
 * client code, pointed at an HttpTransport, would run against the real gateway.
 */
import { DemoTransport, UrbanOSClient, type DemoDataset } from '@datamatters-gmbh/urbanos-core';
import { dailyRhythm, defineDemoDataset, seededRng } from '@datamatters-gmbh/urbanos-demo';

export function buildDataset(): DemoDataset {
  const rng = seededRng(1337);
  return defineDemoDataset({
    seed: 1337,
    tenant: { id: 42, name: 'Demo-Stadt Köln' },
    entities: [
      {
        id: 1,
        name: 'Parkplatz P1',
        category: 'parking',
        lat: 50.9413,
        long: 6.9583,
        streams: [{ id: 11, name: 'occupied', unit: 'bool' }],
      },
      {
        id: 2,
        name: 'Schallpegel Dom',
        category: 'noise',
        lat: 50.9413,
        long: 6.958,
        streams: [{ id: 21, name: 'LAeq', unit: 'dB' }],
      },
    ],
    generators: {
      11: dailyRhythm({ base: 0.5, amplitude: 0.4, peakHour: 13, noise: 0.1, rng }),
      21: dailyRhythm({ base: 55, amplitude: 8, peakHour: 18 }),
    },
  });
}

export interface RunResult {
  element: string;
  parkingCount: number;
  noiseBuckets: number;
}

export async function run(): Promise<RunResult> {
  const client = new UrbanOSClient(new DemoTransport(buildDataset()));

  const element = (await client.element()).name;
  const parking = await client.datasources({ category: 'parking' });

  // Server-shaped aggregation, computed by the SDK's local engine in demo mode.
  const noise = await client
    .timeseries(21)
    .range({ last: '24h' })
    .aggregate('avg', { bucket: '1h', gapFill: 'last-value' })
    .execute();

  return { element, parkingCount: parking.length, noiseBuckets: noise.points.length };
}
