/**
 * @senseering/urbanos-demo
 *
 * Deterministic, seeded data generators plus defineDemoDataset(), which builds a
 * DemoDataset the core client's DemoTransport consumes. Because demo reads run
 * through the same aggregation engine as production, demo mode behaves
 * identically to real mode. See docs/demo-mode.md for the guide.
 */
import type { DemoDataset, DemoEntity } from '@senseering/urbanos-core';

export const DEMO_VERSION = '0.1.0';

/** Mulberry32 — a small, fast, deterministic PRNG. */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DailyRhythmOptions {
  base: number;
  amplitude: number;
  peakHour?: number;
  noise?: number;
  rng?: () => number;
}

/** A daily-rhythm sampler: base + amplitude·sin peaking at peakHour, optional seeded noise. */
export function dailyRhythm(opts: DailyRhythmOptions): (at: Date) => number {
  const peak = opts.peakHour ?? 13;
  const noise = opts.noise ?? 0;
  const rng = opts.rng;
  return (at: Date): number => {
    const h = at.getUTCHours() + at.getUTCMinutes() / 60;
    const phase = ((h - (peak - 6)) / 24) * 2 * Math.PI;
    let v = opts.base + opts.amplitude * Math.sin(phase);
    if (noise > 0 && rng) v += (rng() - 0.5) * 2 * noise * opts.amplitude;
    return Math.round(v * 100) / 100;
  };
}

export interface DefineDemoDatasetInput {
  seed: number;
  tenant: { id: number; name: string };
  entities: DemoEntity[];
  /** streamId → sampler (returns null for a gap). */
  generators: Record<number, (at: Date) => number | null>;
}

/** Build a DemoDataset from entities + per-stream generators. */
export function defineDemoDataset(input: DefineDemoDatasetInput): DemoDataset {
  return {
    tenant: input.tenant,
    entities: input.entities,
    sample: (streamId: number, at: Date): number | null => {
      const gen = input.generators[streamId];
      return gen ? gen(at) : null;
    },
  };
}
