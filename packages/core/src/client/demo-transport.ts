/** DemoTransport answers reads from a deterministic in-memory dataset. Crucially,
 * aggregation runs through the SAME local engine the conformance vectors pin, so
 * demo mode behaves exactly like the gateway. This is what lets one app codebase
 * serve real and demo modes with no branching. */
import { aggregate, parseBucket } from '../timeseries/aggregate.js';
import type { Category } from '../classify/classify.js';
import { matchesDatasourceFilters, validateDatasourceFilters } from './datasource-filters.js';
import { streamDisplayUnit, streamDisplayValue } from './stream-display.js';
import type {
  DatasourceListOptions,
  DatasourceTag,
  DatasourceView,
  ElementView,
  QueryResult,
  Transport,
  TimeseriesQuery,
} from './transport.js';

export interface DemoStream {
  id: number;
  name: string;
  unit: string;
}

export interface DemoEntity {
  id: number;
  name: string;
  category: Category;
  lat: number;
  long: number;
  streams: DemoStream[];
  sensor_type?: string;
  tags?: DatasourceTag[];
}

/** A deterministic demo dataset. `sample` returns the value for a stream at a
 * time (deterministic in the timestamp), or null for a gap. */
export interface DemoDataset {
  tenant: { id: number; name: string };
  entities: DemoEntity[];
  sample(streamId: number, at: Date): number | null;
}

const HOUR = 3_600_000;

export class DemoTransport implements Transport {
  private storage = new Map<string, unknown>();
  private readonly resolutionMs: number;

  constructor(
    private readonly dataset: DemoDataset,
    opts?: { resolutionMs?: number },
  ) {
    this.resolutionMs = opts?.resolutionMs ?? HOUR;
  }

  getElement(): Promise<ElementView> {
    return Promise.resolve({ id: this.dataset.tenant.id, name: this.dataset.tenant.name });
  }

  async listDatasources(opts?: DatasourceListOptions): Promise<DatasourceView[]> {
    validateDatasourceFilters(opts);
    const views = this.dataset.entities
      .map((e) => ({
        id: e.id,
        element_id: this.dataset.tenant.id,
        name: e.name,
        category: e.category,
        lat: e.lat,
        long: e.long,
        streams: e.streams.map((s) => ({ ...s, unit: streamDisplayUnit(s.name, s.unit) })),
        ...(e.sensor_type ? { sensor_type: e.sensor_type } : {}),
        ...(e.tags ? { tags: e.tags.map((tag) => ({ ...tag })) } : {}),
      }))
      .filter((ds) => matchesDatasourceFilters(ds, opts));
    return Promise.resolve(views);
  }

  queryTimeseries(queries: TimeseriesQuery[]): Promise<QueryResult[]> {
    const results = queries.map((q): QueryResult => {
      const stream = this.dataset.entities
        .flatMap((e) => e.streams)
        .find((s) => s.id === q.streamId);
      if (!stream) {
        return { streamId: q.streamId, status: 404, error: 'not found', points: [] };
      }
      const until = q.until ? new Date(q.until) : new Date();
      const from = q.from ? new Date(q.from) : new Date(until.getTime() - 24 * HOUR);
      const raw = this.rawSamples(q.streamId, from, until);
      if (!q.aggregate) {
        return {
          streamId: q.streamId,
          status: 200,
          points: raw.map((s) => ({
            t: s.t.toISOString(),
            v: streamDisplayValue(stream.name, s.v),
          })),
        };
      }
      const buckets = aggregate(
        raw,
        parseBucket(q.aggregate.bucket),
        q.aggregate.function,
        q.aggregate.gapFill ?? '',
      );
      return {
        streamId: q.streamId,
        status: 200,
        points: buckets.map((b) => ({
          t: b.t.toISOString(),
          v: streamDisplayValue(stream.name, b.v),
        })),
      };
    });
    return Promise.resolve(results);
  }

  getStorage(key: string): Promise<unknown> {
    return Promise.resolve(this.storage.get(key));
  }

  putStorage(key: string, value: unknown): Promise<void> {
    this.storage.set(key, value);
    return Promise.resolve();
  }

  private rawSamples(streamId: number, from: Date, until: Date): { t: Date; v: number }[] {
    const out: { t: Date; v: number }[] = [];
    const start = Math.floor(from.getTime() / this.resolutionMs) * this.resolutionMs;
    for (let t = start; t <= until.getTime(); t += this.resolutionMs) {
      const at = new Date(t);
      const v = this.dataset.sample(streamId, at);
      if (v !== null) out.push({ t: at, v });
    }
    return out;
  }
}
