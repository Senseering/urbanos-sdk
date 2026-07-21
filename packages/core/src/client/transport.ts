/** The transport abstraction: how the client talks to a data source. HTTP (the
 * gateway) and demo (local) implementations exist; app code is identical over
 * both. DTOs mirror the gateway /v1 surface. */
import type { AggFunc, GapFill } from '../timeseries/aggregate';

export interface StreamView {
  id: number;
  name: string;
  unit: string;
}

export interface DatasourceView {
  id: number;
  element_id: number;
  name: string;
  category: string;
  lat: number;
  long: number;
  streams: StreamView[];
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

export interface IngestPoint {
  streamId: number;
  t: string;
  v: number;
}

export interface ElementView {
  id: number;
  name: string;
}

export interface Transport {
  getElement(): Promise<ElementView>;
  listDatasources(opts?: { category?: string }): Promise<DatasourceView[]>;
  queryTimeseries(queries: TimeseriesQuery[]): Promise<QueryResult[]>;
  ingest(points: IngestPoint[]): Promise<{ accepted: number }>;
  getStorage(key: string): Promise<unknown>;
  putStorage(key: string, value: unknown): Promise<void>;
}
