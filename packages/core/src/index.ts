/**
 * @datamatters-gmbh/urbanos-core
 *
 * Framework-agnostic urbanOS client: classification + aggregation engines (kept
 * in lockstep with the gateway via conformance vectors), the typed timeseries
 * query builder, the client with HTTP + demo transports, auth token providers,
 * runtime context, and the error taxonomy.
 */
export const CORE_VERSION = '0.1.0';

export * from './classify/classify.js';
export * from './timeseries/aggregate.js';
export * from './timeseries/query.js';
export * from './errors/errors.js';
export * from './context/context.js';
export * from './auth/token-provider.js';
export * from './auth/env.js';
export * from './auth/pkce.js';
export * from './auth/oauth-http.js';
export * from './auth/pkce-token-provider.js';
export * from './auth/host-token-provider.js';
export * from './client/transport.js';
export * from './client/demo-transport.js';
export * from './client/http-transport.js';
export * from './client/client.js';

export * from './client/read-fetch.js';
export type { HistoryPage, HistoryRequest } from './client/history.js';
