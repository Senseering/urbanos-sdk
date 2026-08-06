/** UrbanOSClient is the app-facing entry point over any Transport. */
import { TimeseriesQueryBuilder } from '../timeseries/query';
import type { DatasourceView, ElementView, Transport } from './transport';

export class UrbanOSClient {
  readonly storage: {
    get(key: string): Promise<unknown>;
    put(key: string, value: unknown): Promise<void>;
  };

  constructor(private readonly transport: Transport) {
    this.storage = {
      get: (key) => this.transport.getStorage(key),
      put: (key, value) => this.transport.putStorage(key, value),
    };
  }

  element(): Promise<ElementView> {
    return this.transport.getElement();
  }

  datasources(opts?: { category?: string }): Promise<DatasourceView[]> {
    return this.transport.listDatasources(opts);
  }

  /** Begin a typed timeseries query for one stream. */
  timeseries(streamId: number): TimeseriesQueryBuilder {
    return new TimeseriesQueryBuilder(this.transport, streamId);
  }
}
