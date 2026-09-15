/** The transport abstraction: how the client talks to a data source. HTTP (the
 * gateway) and demo (local) implementations exist; app code is identical over
 * both. DTOs mirror the gateway /v1 surface. */
import type { AggFunc, GapFill } from '../timeseries/aggregate.js';

export interface StreamView {
  id: number;
  name: string;
  unit: string;
}

export interface DatasourceTag {
  id: number;
  name: string;
}

export interface DatasourceListOptions {
  category?: string;
  /** Exact, case-sensitive sensor type. First-party gateway clients only. */
  sensorType?: string;
  /** Match ALL selected tag IDs (at most 50). Empty means no tag filter. First-party only. */
  tagIds?: number[];
}

export interface DatasourceView {
  id: number;
  element_id: number;
  name: string;
  category: string;
  lat: number;
  long: number;
  streams: StreamView[];
  /** First-party metadata; omitted if unavailable or not authorised. */
  sensor_type?: string;
  tags?: DatasourceTag[];
}

export interface AggregateSpec {
  function: AggFunc;
  bucket: string;
  gapFill?: GapFill;
}

export interface TimeseriesQuery {
  streamId: number;
  from?: string; // RFC3339
  until?: string; // RFC3339
  aggregate?: AggregateSpec;
}

export interface SeriesPoint {
  t: string;
  v: number;
}

export interface QueryResult {
  streamId: number;
  status: number;
  error?: string;
  points: SeriesPoint[];
}

export interface ElementView {
  id: number;
  name: string;
  /**
   * Authorised mandate names for service tokens with element:read.
   * Absent for user tokens or older gateways; [] means no authorised mandates.
   */
  mandates?: Array<{ id: number; name: string }>;
}

export interface Transport {
  getElement(): Promise<ElementView>;
  listDatasources(opts?: DatasourceListOptions): Promise<DatasourceView[]>;
  queryTimeseries(queries: TimeseriesQuery[]): Promise<QueryResult[]>;
  getStorage(key: string): Promise<unknown>;
  putStorage(key: string, value: unknown): Promise<void>;
}
