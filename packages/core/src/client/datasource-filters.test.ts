import { describe, expect, test } from 'vitest';
import { UrbanOSClient } from './client.js';
import { DemoTransport, type DemoDataset } from './demo-transport.js';
import { HttpTransport } from './http-transport.js';
import { StaticTokenProvider } from '../auth/token-provider.js';
import type { DatasourceListOptions } from './transport.js';

const dataset: DemoDataset = {
  tenant: { id: 42, name: 'Demo' },
  entities: [
    {
      id: 1,
      name: 'A',
      category: 'parking',
      lat: 0,
      long: 0,
      streams: [],
      sensor_type: 'BLE / outdoor',
      tags: [
        { id: 7, name: 'Park' },
        { id: 8, name: 'Public' },
      ],
    },
    {
      id: 2,
      name: 'B',
      category: 'parking',
      lat: 0,
      long: 0,
      streams: [],
      sensor_type: 'temperature',
      tags: [{ id: 7, name: 'Park' }],
    },
    { id: 3, name: 'C', category: 'noise', lat: 0, long: 0, streams: [] },
  ],
  sample: () => null,
};

for (const mode of ['demo', 'http'] as const) {
  describe(`${mode} datasource filters`, () => {
    function setup() {
      const urls: URL[] = [];
      const transport =
        mode === 'demo'
          ? new DemoTransport(dataset)
          : new HttpTransport({
              baseUrl: 'https://gateway.example',
              tokens: new StaticTokenProvider({
                accessToken: 'test',
                expiresAt: Date.now() + 60000,
                tenantId: 42,
                scopes: ['datasources:read'],
              }),
              // An older gateway ignoring filters must not widen SDK results.
              fetchImpl: (url) => {
                urls.push(new URL(url instanceof Request ? url.url : url));
                return Promise.resolve(
                  Response.json({
                    datasources: dataset.entities.map((e) => ({ ...e, element_id: 42 })),
                  }),
                );
              },
            });
      return { client: new UrbanOSClient(transport), urls };
    }

    test.each<[DatasourceListOptions | undefined, number[]]>([
      [undefined, [1, 2, 3]],
      [{ tagIds: [] }, [1, 2, 3]],
      [{ tagIds: [7] }, [1, 2]],
      [{ tagIds: [7, 8] }, [1]],
      [{ tagIds: [8, 7, 7] }, [1]],
      [{ sensorType: 'BLE / outdoor', tagIds: [7, 8], category: 'parking' }, [1]],
      [{ sensorType: 'Temperature' }, []],
      [{ tagIds: [999] }, []],
      [{ tagIds: [7], category: 'noise' }, []],
    ])('filters %j', async (opts, expected) => {
      const { client } = setup();
      expect((await client.datasources(opts)).map((d) => d.id)).toEqual(expected);
    });

    test('preserves metadata and encodes filters', async () => {
      const { client, urls } = setup();
      const results = await client.datasources({
        sensorType: 'BLE / outdoor',
        tagIds: [7, 8],
        category: 'parking',
      });
      expect(results[0]?.sensor_type).toBe('BLE / outdoor');
      expect(results[0]?.tags).toEqual(dataset.entities[0]?.tags);
      if (mode === 'http') {
        expect(urls[0]?.searchParams.get('sensor_type')).toBe('BLE / outdoor');
        expect(urls[0]?.searchParams.get('tag_ids')).toBe('7,8');
        expect(urls[0]?.searchParams.get('category')).toBe('parking');
      }
    });

    test.each<DatasourceListOptions>([
      { tagIds: [0] },
      { tagIds: [-1] },
      { tagIds: [1.5] },
      { tagIds: [NaN] },
      { tagIds: [Number.MAX_SAFE_INTEGER + 1] },
      { tagIds: Array.from({ length: 51 }, () => 7) },
      { sensorType: 'a'.repeat(257) },
    ])('rejects invalid filters %j before fetching', async (opts) => {
      const { client, urls } = setup();
      await expect(client.datasources(opts)).rejects.toBeInstanceOf(RangeError);
      expect(urls).toHaveLength(0);
    });
  });
}
