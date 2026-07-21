import { describe, expect, test } from 'vitest';
import { defineAppManifest, validateAppManifest } from './index';

const valid = {
  manifestVersion: 1 as const,
  id: 'io.acme.air-quality',
  version: '1.0.0',
  name: { en: 'Air Quality', de: 'Luftqualität' },
  developer: { name: 'Acme GmbH', supportEmail: 'support@acme.io' },
  embed: { protocol: 2 as const, hostOrigins: ['https://*.udp.city'] },
  scopes: { required: [{ scope: 'timeseries.read', reason: { de: 'Messwerte anzeigen' } }] },
};

describe('app manifest', () => {
  test('defineAppManifest applies defaults', () => {
    const m = defineAppManifest(valid);
    expect(m.categories).toEqual([]);
    expect(m.locales).toEqual(['de']);
    expect(m.embed.modes).toEqual(['app']);
  });

  test('rejects a non-reverse-DNS id', () => {
    const r = validateAppManifest({ ...valid, id: 'notdns' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toContain('id');
  });

  test('rejects a missing required block', () => {
    const r = validateAppManifest({ manifestVersion: 1, id: 'io.acme.x' });
    expect(r.ok).toBe(false);
  });
});
