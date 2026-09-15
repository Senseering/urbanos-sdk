/** HttpTransport talks to the gateway /v1 REST API, attaching the scoped app
 * token from a TokenProvider. */
import type { AccessToken, TokenProvider } from '../auth/token-provider.js';
import { AuthError, GatewayError } from '../errors/errors.js';
import { matchesDatasourceFilters, validateDatasourceFilters } from './datasource-filters.js';
import type {
  DatasourceListOptions,
  DatasourceView,
  ElementView,
  QueryResult,
  TimeseriesQuery,
  Transport,
} from './transport.js';

export interface HttpTransportOptions {
  baseUrl: string;
  tokens: TokenProvider;
  fetchImpl?: typeof fetch;
  /**
   * Retry once with a refreshed token after a 401. Default true.
   * Set false to opt out (e.g. when the caller drives re-auth itself).
   */
  retryOnUnauthorized?: boolean;
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

  /**
   * One authenticated fetch, with a single refresh-on-401 retry.
   *
   * Both request paths route through here so `getStorage()` stops being the odd
   * one out — before this it bypassed `req()` entirely and surfaced a 401 as a
   * GatewayError instead of an AuthError.
   *
   * Exactly ONE retry, ever. The identical-token guard makes a provider that
   * cannot actually refresh (StaticTokenProvider, whose refresh() is a no-op)
   * cost one no-op call and zero extra fetches.
   */
  private async authedFetch(
    path: string,
    init?: { method?: string; body?: unknown },
  ): Promise<Response> {
    const send = (tok: AccessToken): Promise<Response> =>
      this.fetchImpl(this.opts.baseUrl + path, {
        method: init?.method ?? 'GET',
        headers: {
          Authorization: `Bearer ${tok.accessToken}`,
          ...(init?.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      });

    const first = await this.opts.tokens.getToken();
    const res = await send(first);
    if (res.status !== 401 || this.opts.retryOnUnauthorized === false) return res;

    const next = await this.opts.tokens.refresh();
    if (next.accessToken === first.accessToken) return res;
    return send(next);
  }

  private async req<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await this.authedFetch(path, { method, body });
    if (res.status === 401) throw new AuthError();
    if (!res.ok) throw new GatewayError(`gateway responded ${res.status}`, res.status);
    return (await res.json()) as T;
  }

  getElement(): Promise<ElementView> {
    return this.req<ElementView>('GET', '/v1/element');
  }

  async listDatasources(opts?: DatasourceListOptions): Promise<DatasourceView[]> {
    validateDatasourceFilters(opts);
    const params = new URLSearchParams();
    if (opts?.category) params.set('category', opts.category);
    if (opts?.sensorType) params.set('sensor_type', opts.sensorType);
    if (opts?.tagIds?.length) params.set('tag_ids', opts.tagIds.join(','));
    const q = params.size ? `?${params}` : '';
    const r = await this.req<{ datasources: DatasourceView[] }>('GET', `/v1/datasources${q}`);
    // Older gateways may ignore unknown query parameters. Never return broader
    // results than requested; absent metadata cannot satisfy a metadata filter.
    return r.datasources.filter((ds) => matchesDatasourceFilters(ds, opts));
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

  async getStorage(key: string): Promise<unknown> {
    const res = await this.authedFetch(`/v1/storage/${encodeURIComponent(key)}`);
    // 404 first: "no value stored" is a normal result here, not an error.
    if (res.status === 404) return undefined;
    if (res.status === 401) throw new AuthError();
    if (!res.ok) throw new GatewayError(`gateway responded ${res.status}`, res.status);
    const r = (await res.json()) as { value: unknown };
    return r.value;
  }

  async putStorage(key: string, value: unknown): Promise<void> {
    await this.req('PUT', `/v1/storage/${encodeURIComponent(key)}`, value);
  }
}
