/**
 * @senseering/urbanos-core
 *
 * Framework-agnostic urbanOS client: classification + aggregation engines (kept
 * in lockstep with the Go gateway via conformance vectors), the typed timeseries
 * query builder, the client with HTTP + demo transports, auth token providers,
 * runtime context, and the error taxonomy.
 */
export const CORE_VERSION = '0.1.0';

export * from './classify/classify';
export * from './timeseries/aggregate';
export * from './timeseries/query';
export * from './errors/errors';
export * from './context/context';
export * from './auth/token-provider';
export * from './auth/env';
export * from './auth/pkce';
export * from './auth/oauth-http';
export * from './auth/pkce-token-provider';
export * from './auth/host-token-provider';
export * from './client/transport';
export * from './client/demo-transport';
export * from './client/http-transport';
export * from './client/client';
