/** The typed timeseries query builder. It compiles to the gateway query DTO and
 * surfaces datacore's server-side aggregation, so apps stop downloading raw
 * samples. Identical over HTTP and demo transports. */
import type { AggFunc, GapFill } from './aggregate';
import type { QueryResult, TimeseriesQuery, Transport } from '../client/transport';

export interface RangeSpec {
  from?: string | Date;
  until?: string | Date;
  last?: string; // e.g. "24h", "90d", "2w"
}

export class TimeseriesQueryBuilder {
  private readonly query: TimeseriesQuery;

  constructor(
    private readonly transport: Transport,
    streamId: number,
  ) {
    this.query = { streamId };
  }

  range(r: RangeSpec): this {
    if (r.last !== undefined) {
      const until = new Date();
      this.query.from = new Date(until.getTime() - parseDuration(r.last)).toISOString();
      this.query.until = until.toISOString();
    }
    if (r.from !== undefined) this.query.from = toISO(r.from);
    if (r.until !== undefined) this.query.until = toISO(r.until);
    return this;
  }

  aggregate(fn: AggFunc, opts: { bucket: string; gapFill?: GapFill }): this {
    this.query.aggregate = { function: fn, bucket: opts.bucket, gapFill: opts.gapFill };
    return this;
  }

  async execute(): Promise<QueryResult> {
    const results = await this.transport.queryTimeseries([this.query]);
    return results[0]!;
  }
}

function toISO(x: string | Date): string {
  return typeof x === 'string' ? x : x.toISOString();
}

function parseDuration(s: string): number {
  const m = /^(\d+)(m|h|d|w)$/.exec(s);
  if (!m) throw new Error(`invalid duration: ${s}`);
  const n = Number(m[1]);
  switch (m[2]) {
    case 'm':
      return n * 60_000;
    case 'h':
      return n * 3_600_000;
    case 'd':
      return n * 86_400_000;
    default:
      return n * 604_800_000;
  }
}
