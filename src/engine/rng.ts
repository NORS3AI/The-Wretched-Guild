// Deterministic, serializable RNG. State is just (seed, cursor) — both live in
// the save file, so a loaded game continues the exact same random stream.

import type { RunState } from './types';

/** Hash (seed, cursor) → float in [0, 1). Pure — same inputs, same output. */
export function rngAt(seed: number, cursor: number): number {
  let t = (seed ^ Math.imul(cursor + 1, 0x9e3779b1)) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Draw the next float in [0, 1) and advance the run's cursor. */
export function nextFloat(run: RunState): number {
  const v = rngAt(run.seed, run.rngCursor);
  run.rngCursor++;
  return v;
}

/** Integer in [min, max] inclusive. */
export function nextInt(run: RunState, min: number, max: number): number {
  return min + Math.floor(nextFloat(run) * (max - min + 1));
}

/** True with probability p (0..1). */
export function chance(run: RunState, p: number): boolean {
  return nextFloat(run) < p;
}

/** A fresh-ish seed derived from the current clock. Only used when starting a
 *  brand-new life — never during simulation, so determinism is preserved. */
export function freshSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
}
