/** UrbanOSClient is the app-facing entry point over any Transport. */
import type { TokenProvider } from '../auth/token-provider';
import { TimeseriesQueryBuilder } from '../timeseries/query';
import type { DatasourceView, ElementView, Transport } from './transport';

export interface UrbanOSClientOptions {
  /**
   * The token provider backing the transport. When supplied, the client can
   * surface token-derived context such as the active mandate. Optional and
   * backward-compatible: omit it and `mandateId()` resolves to undefined.
   */
  tokens?: TokenProvider;
}

export class UrbanOSClient {
  readonly storage: {
    get(key: string): Promise<unknown>;
    put(key: string, value: unknown): Promise<void>;
  };

  private readonly tokens?: TokenProvider;

  constructor(
    private readonly transport: Transport,
    opts: UrbanOSClientOptions = {},
  ) {
    this.tokens = opts.tokens;
    this.storage = {
      get: (key) => this.transport.getStorage(key),
      put: (key, value) => this.transport.putStorage(key, value),
    };
  }

  element(): Promise<ElementView> {
    return this.transport.getElement();
  }

  /**
   * The active mandate id (a sub-tenant grouping within the element), read from
   * the current access token. Undefined when no token provider is wired or the
   * token carries no mandate (instance-level).
   */
  async mandateId(): Promise<number | undefined> {
    if (!this.tokens) return undefined;
    return (await this.tokens.getToken()).mandateId;
  }

  datasources(opts?: { category?: string }): Promise<DatasourceView[]> {
    return this.transport.listDatasources(opts);
  }

  /** Begin a typed timeseries query for one stream. */
  timeseries(streamId: number): TimeseriesQueryBuilder {
    return new TimeseriesQueryBuilder(this.transport, streamId);
  }
}
