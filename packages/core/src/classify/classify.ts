/**
 * Datasource → category classification. This is the local twin of the gateway's
 * classifier; the identical keyword ruleset is pinned by the conformance vectors
 * in `src/__fixtures__`. Apps mostly receive the server-computed category, but
 * the SDK ships this so demo mode classifies identically.
 */

export interface Stream {
  name: string;
  unit: string;
}

export interface Datasource {
  name: string;
  streams: Stream[];
}

export type Category =
  | 'parking'
  | 'noise'
  | 'waste'
  | 'garden'
  | 'water'
  | 'energy'
  | 'weather'
  | 'occupancy'
  | 'ble'
  | 'building'
  | 'generic';

export const CATEGORIES: Category[] = [
  'parking',
  'noise',
  'waste',
  'garden',
  'water',
  'energy',
  'weather',
  'occupancy',
  'ble',
  'building',
  'generic',
];

/** Classify a datasource. Streams win over the datasource name; first match wins. */
export function classify(ds: Datasource): Category {
  for (const s of ds.streams) {
    const c = classifyText(s.name.toLowerCase(), s.unit.toLowerCase());
    if (c !== 'generic') return c;
  }
  const c = classifyText(ds.name.toLowerCase(), '');
  return c;
}

function hasAny(s: string, ...subs: string[]): boolean {
  return subs.some((sub) => s.includes(sub));
}

/** The shared keyword ruleset. Keep in lockstep with the Go classifier. */
function classifyText(name: string, unit: string): Category {
  if (
    unit === 'db' ||
    unit === 'dba' ||
    hasAny(name, 'laeq', 'lden', 'schall', 'noise', 'lärm', 'laerm')
  )
    return 'noise';
  if (hasAny(name, 'fill_level', 'fill', 'füll', 'fuell', 'muell', 'müll', 'waste', 'bin'))
    return 'waste';
  if (hasAny(name, 'occup', 'belegt', 'parking', 'parkplatz', 'stellplatz', 'bay'))
    return 'parking';
  if (hasAny(name, 'people', 'count', 'passage', 'footfall', 'pedestrian')) return 'occupancy';
  if (hasAny(name, 'soil', 'moisture', 'garden', 'irrigation', 'boden')) return 'garden';
  if (hasAny(name, 'water_level', 'drain', 'sink', 'flood', 'pegel')) return 'water';
  if (unit === 'kwh' || unit === 'w' || hasAny(name, 'energy', 'power', 'consumption', 'strom'))
    return 'energy';
  if (hasAny(name, 'temperature', 'humidity', 'weather', 'rain', 'wind')) return 'weather';
  if (hasAny(name, 'rssi', 'beacon', 'ble', 'bluetooth')) return 'ble';
  if (hasAny(name, 'co2', 'voc', 'indoor', 'room', 'building')) return 'building';
  return 'generic';
}
