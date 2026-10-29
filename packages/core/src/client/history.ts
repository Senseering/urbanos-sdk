import { GatewayError } from '../errors/errors.js';
import type { AggFunc } from '../timeseries/aggregate.js';

export interface HistoryRequest {
  from: string;
  until: string;
  pageDuration?: string;
  aggregate?: { function: AggFunc; bucket: string };
}
export interface HistoryPage {
  stream_id: number;
  covered_from: string;
  covered_until: string;
  points: Array<{ timestamp: string; value: number | string }>;
  next?: string;
}
function instant(value: string): bigint | null {
  const match = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.(\d{1,9}))?(Z|[+-]\d\d:\d\d)$/.exec(value);
  if (!match) return null;
  const seconds = Date.parse(match[1]! + match[3]!);
  return Number.isFinite(seconds)
    ? BigInt(seconds) * 1_000_000n + BigInt((match[2] ?? '').padEnd(9, '0'))
    : null;
}
/** Explicit, one-page-at-a-time traversal; no prefetch or automatic accumulation. */
export async function* walkHistory(
  baseUrl: string,
  streamId: number,
  options: HistoryRequest,
  request: (path: string) => Promise<HistoryPage>,
): AsyncGenerator<HistoryPage, void, unknown> {
  if (!Number.isSafeInteger(streamId) || streamId <= 0)
    throw new TypeError('streamId must be a positive safe integer');
  let expectedFrom = instant(options.from);
  const end = instant(options.until);
  if (expectedFrom === null || end === null || end <= expectedFrom)
    throw new TypeError('Provide a valid from and until interval');
  const path = `/v1/streams/${streamId}/observations`;
  const target = new URL(baseUrl + path);
  const params = new URLSearchParams({
    from: options.from,
    until: options.until,
    page_duration: options.pageDuration ?? '1h',
  });
  if (options.aggregate) {
    params.set('aggregate', options.aggregate.function);
    params.set('bucket', options.aggregate.bucket);
  }
  let next = path + '?' + params.toString();
  while (next) {
    const page = await request(next);
    const from = typeof page.covered_from === 'string' ? instant(page.covered_from) : null;
    const until = typeof page.covered_until === 'string' ? instant(page.covered_until) : null;
    if (
      page.stream_id !== streamId ||
      from !== expectedFrom ||
      until === null ||
      until <= from ||
      until > end ||
      !Array.isArray(page.points) ||
      page.points.length > 10000
    )
      throw new GatewayError('Gateway returned an invalid history page', 502);
    for (const point of page.points) {
      const at = typeof point.timestamp === 'string' ? instant(point.timestamp) : null;
      if (
        at === null ||
        at < from ||
        at >= until ||
        !(
          typeof point.value === 'string' ||
          (typeof point.value === 'number' && Number.isFinite(point.value))
        )
      )
        throw new GatewayError('Gateway returned an invalid history point', 502);
    }
    let continuation = '';
    if (page.next) {
      const url = new URL(page.next, target);
      if (
        url.origin !== target.origin ||
        url.pathname !== target.pathname ||
        url.username ||
        url.password ||
        url.hash ||
        until === end
      )
        throw new GatewayError('Gateway returned an unsafe history continuation', 502);
      if (
        instant(url.searchParams.get('from') ?? '') !== until ||
        instant(url.searchParams.get('until') ?? '') !== end
      )
        throw new GatewayError('History continuation changed the covered interval', 502);
      for (const key of ['page_duration', 'aggregate', 'bucket'])
        if (url.searchParams.get(key) !== params.get(key))
          throw new GatewayError('History continuation changed query options', 502);
      if (
        Array.from(url.searchParams.keys()).some(
          (key) =>
            !['from', 'until', 'page_duration', 'aggregate', 'bucket'].includes(key) ||
            url.searchParams.getAll(key).length !== 1,
        )
      )
        throw new GatewayError('History continuation has unexpected parameters', 502);
      continuation = url.pathname + url.search;
    } else if (until !== end)
      throw new GatewayError('History ended before the requested interval was covered', 502);
    yield page;
    expectedFrom = until;
    next = continuation;
  }
}
