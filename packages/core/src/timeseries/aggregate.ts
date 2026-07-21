/**
 * The timeseries aggregation engine. It implements datacore's transformation
 * semantics (bucket aggregation + gap-fill) so that demo mode produces the same
 * results as the gateway. This is the TS half of a Go↔TS pair pinned by the
 * shared conformance vectors (see the gateway's internal/timeseries).
 */

export interface Sample {
  t: Date;
  v: number;
}

export interface Bucket {
  t: Date;
  v: number;
}

export type AggFunc = 'avg' | 'min' | 'max' | 'sum';
export type GapFill = 'zero' | 'last-value' | 'linear-interpol' | '';

/** Parse a datacore bucket string such as "30m", "1h", or "1d" into milliseconds. */
export function parseBucket(spec: string): number {
  const m = /^(\d+)(s|m|h|d)$/.exec(spec);
  if (!m) throw new Error(`invalid bucket: ${spec}`);
  const n = Number(m[1]);
  switch (m[2]) {
    case 's':
      return n * 1000;
    case 'm':
      return n * 60_000;
    case 'h':
      return n * 3_600_000;
    default:
      return n * 86_400_000;
  }
}

/**
 * Bucket samples by `bucketMs` (aligned to the epoch), apply `fn` within each
 * bucket, and fill empty buckets per `gap`. Buckets run from the one containing
 * the first sample to the one containing the last.
 */
export function aggregate(
  samples: Sample[],
  bucketMs: number,
  fn: AggFunc,
  gap: GapFill,
): Bucket[] {
  if (samples.length === 0 || bucketMs <= 0) return [];

  const sorted = [...samples].sort((a, b) => a.t.getTime() - b.t.getTime());
  const bucketOf = (t: Date): number => Math.floor(t.getTime() / bucketMs) * bucketMs;

  const grouped = new Map<number, number[]>();
  for (const s of sorted) {
    const key = bucketOf(s.t);
    const arr = grouped.get(key);
    if (arr) arr.push(s.v);
    else grouped.set(key, [s.v]);
  }

  const start = bucketOf(sorted[0]!.t);
  const end = bucketOf(sorted[sorted.length - 1]!.t);

  interface Cell {
    t: number;
    v: number;
    empty: boolean;
  }
  const cells: Cell[] = [];
  for (let t = start; t <= end; t += bucketMs) {
    const vals = grouped.get(t);
    if (vals) cells.push({ t, v: apply(fn, vals), empty: false });
    else cells.push({ t, v: 0, empty: true });
  }

  fillGaps(cells, gap);
  return cells.map((c) => ({ t: new Date(c.t), v: c.v }));
}

function apply(fn: AggFunc, vals: number[]): number {
  switch (fn) {
    case 'min':
      return Math.min(...vals);
    case 'max':
      return Math.max(...vals);
    case 'sum':
      return vals.reduce((a, b) => a + b, 0);
    default:
      return vals.reduce((a, b) => a + b, 0) / vals.length;
  }
}

function fillGaps(cells: { t: number; v: number; empty: boolean }[], gap: GapFill): void {
  if (gap === 'zero' || gap === '') {
    for (const c of cells) {
      if (c.empty) {
        c.v = 0;
        c.empty = false;
      }
    }
    return;
  }
  if (gap === 'last-value') {
    let last = 0;
    for (const c of cells) {
      if (c.empty) {
        c.v = last;
        c.empty = false;
      } else {
        last = c.v;
      }
    }
    return;
  }
  // linear-interpol
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]!;
    if (!cell.empty) continue;
    let prev = -1;
    let next = -1;
    for (let j = i - 1; j >= 0; j--) {
      if (!cells[j]!.empty) {
        prev = j;
        break;
      }
    }
    for (let j = i + 1; j < cells.length; j++) {
      if (!cells[j]!.empty) {
        next = j;
        break;
      }
    }
    if (prev === -1 && next === -1) cell.v = 0;
    else if (prev === -1) cell.v = cells[next]!.v;
    else if (next === -1) cell.v = cells[prev]!.v;
    else {
      const span = next - prev;
      const frac = (i - prev) / span;
      cell.v = cells[prev]!.v + (cells[next]!.v - cells[prev]!.v) * frac;
    }
    cell.empty = false;
  }
}
