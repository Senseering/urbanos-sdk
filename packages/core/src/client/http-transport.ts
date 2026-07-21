/** HttpTransport talks to the gateway /v1 REST API, attaching the scoped app
 * token from a TokenProvider. */
import type { TokenProvider } from '../auth/token-provider';
import { AuthError, GatewayError } from '../errors/errors';
import type {
  DatasourceView,
  ElementView,
  IngestPoint,
  QueryResult,
  TimeseriesQuery,
  Transport,
} from './transport';

export interface HttpTransportOptions {
  baseUrl: string;
  tokens: TokenProvider;
  fetchImpl?: typeof fetch;
}

interface RawResult {
  stream_id: number;
  status: number;
  error?: string;
  points?: { t: string; v: number }[];
}

export class HttpTransport implements Transport {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly opts: HttpTransportOptions) {
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private async req<T>(method: string, path: string, body?: unknown): Promise<T> {
    const tok = await this.opts.tokens.getToken();
    const res = await this.fetchImpl(this.opts.baseUrl + path, {
      method,
      headers: {
        Authorization: `Bearer ${tok.accessToken}`,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) throw new AuthError();
    if (!res.ok) throw new GatewayError(`gateway responded ${res.status}`, res.status);
    return (await res.json()) as T;
  }

  getElement(): Promise<ElementView> {
    return this.req<ElementView>('GET', '/v1/element');
  }

  async listDatasources(opts?: { category?: string }): Promise<DatasourceView[]> {
    const q = opts?.category ? `?category=${encodeURIComponent(opts.category)}` : '';
    const r = await this.req<{ datasources: DatasourceView[] }>('GET', `/v1/datasources${q}`);
    return r.datasources;
  }

  async queryTimeseries(queries: TimeseriesQuery[]): Promise<QueryResult[]> {
    const body = {
      queries: queries.map((q) => ({
        stream_id: q.streamId,
        from: q.from,
        until: q.until,
        aggregate: q.aggregate
          ? {
              function: q.aggregate.function,
              bucket: q.aggregate.bucket,
              gap_fill: q.aggregate.gapFill,
            }
          : undefined,
      })),
    };
    const r = await this.req<{ results: RawResult[] }>('POST', '/v1/timeseries/query', body);
    return r.results.map((x) => ({
      streamId: x.stream_id,
      status: x.status,
      error: x.error,
      points: x.points ?? [],
    }));
  }

  ingest(points: IngestPoint[]): Promise<{ accepted: number }> {
    const body = { points: points.map((p) => ({ stream_id: p.streamId, t: p.t, v: p.v })) };
    return this.req<{ accepted: number }>('POST', '/v1/timeseries/ingest', body);
  }

  async getStorage(key: string): Promise<unknown> {
    const tok = await this.opts.tokens.getToken();
    const res = await this.fetchImpl(`${this.opts.baseUrl}/v1/storage/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${tok.accessToken}` },
    });
    if (res.status === 404) return undefined;
    if (!res.ok) throw new GatewayError(`gateway responded ${res.status}`, res.status);
    const r = (await res.json()) as { value: unknown };
    return r.value;
  }

  async putStorage(key: string, value: unknown): Promise<void> {
    await this.req('PUT', `/v1/storage/${encodeURIComponent(key)}`, value);
  }
}
