// The D&D compass (§6). Alignment emerges from cumulative choices; a pure
// function maps the two axes onto the 9 classic cells and the path gates.

import type { Alignment, RunState } from './types';
import { nextFloat } from './rng';

export const ALIGN_BAND = 33; // |value| > 33 → committed to a side

export type Ethics = 'Lawful' | 'Neutral' | 'Chaotic';
export type Morals = 'Good' | 'Neutral' | 'Evil';

export function ethicsBand(a: Alignment): Ethics {
  if (a.ethics > ALIGN_BAND) return 'Lawful';
  if (a.ethics < -ALIGN_BAND) return 'Chaotic';
  return 'Neutral';
}

export function moralsBand(a: Alignment): Morals {
  if (a.morals > ALIGN_BAND) return 'Good';
  if (a.morals < -ALIGN_BAND) return 'Evil';
  return 'Neutral';
}

/** e.g. "Lawful Evil", "True Neutral". */
export function alignmentName(a: Alignment): string {
  const e = ethicsBand(a);
  const m = moralsBand(a);
  if (e === 'Neutral' && m === 'Neutral') return 'True Neutral';
  return `${e} ${m}`;
}

function clamp(v: number): number {
  return Math.max(-100, Math.min(100, v));
}

/** Apply a choice's weight. "Sticky": the further you already lean into a
 *  corner, the more a same-direction nudge is dampened, so escaping a
 *  reputation is slow (design fork §18 — leaning sticky). */
export function shiftAlignment(run: RunState, dEthics: number, dMorals: number): void {
  const a = run.alignment;
  a.ethics = clamp(a.ethics + resist(a.ethics, dEthics));
  a.morals = clamp(a.morals + resist(a.morals, dMorals));
}

/** Incidental bearing drift from everyday deeds: a random 0.30–0.60 nudge along
 *  an axis. `ethicsDir`/`moralsDir` are -1, 0, or +1. */
export function driftBearing(run: RunState, ethicsDir: number, moralsDir: number): void {
  const mag = () => 0.3 + nextFloat(run) * 0.3;
  shiftAlignment(run, ethicsDir === 0 ? 0 : ethicsDir * mag(), moralsDir === 0 ? 0 : moralsDir * mag());
}

/** Honest, ordinary work (Hard Labour and the Commons trades) has no moral or
 *  political colour — it pulls the bearing back toward True Neutral on BOTH axes,
 *  never past zero. Grind these and you drift to the centre and hold there. */
export function neutralize(run: RunState, mag: number): void {
  const toward0 = (v: number): number => (v > 0 ? Math.max(0, v - mag) : v < 0 ? Math.min(0, v + mag) : 0);
  run.alignment.ethics = toward0(run.alignment.ethics);
  run.alignment.morals = toward0(run.alignment.morals);
}

/** A deliberate RPG-choice's bearing nudge — the slow burn (§6, design fork). A
 *  single murder is bad, evil, chaotic — but it moves you only a little. Each
 *  non-zero axis shifts a random 0.1–0.4 in the chosen direction, so your
 *  alignment is the sum of a hundred choices, never one. `ethicsDir`/`moralsDir`
 *  are the signs of the intent (-1, 0, +1); magnitude is deliberately small. */
export function sway(run: RunState, ethicsDir: number, moralsDir: number): void {
  const mag = () => 0.1 + nextFloat(run) * 0.3; // 0.1–0.4
  shiftAlignment(
    run,
    ethicsDir === 0 ? 0 : Math.sign(ethicsDir) * mag(),
    moralsDir === 0 ? 0 : Math.sign(moralsDir) * mag(),
  );
}

/** Taking a life is no ordinary wickedness — it moves your Evil (morals) by a
 *  raw 1–3, far more than the slow-burn nudge of a lesser choice. (The choice's
 *  Lawful/Chaotic lean is still applied separately with sway().) */
export function killEvil(run: RunState): void {
  shiftAlignment(run, 0, -(1 + nextFloat(run) * 2)); // −1 to −3 morals
}

function resist(current: number, delta: number): number {
  if (delta === 0) return 0;
  const sameDir = Math.sign(current) === Math.sign(delta);
  // deeper commitment resists further movement in the SAME direction;
  // movement toward the opposite pole is unhindered (corruption/redemption).
  const commit = Math.abs(current) / 100; // 0..1
  const damp = sameDir ? 1 - 0.6 * commit : 1;
  return delta * damp;
}

// ── Path gates (§9). Institutions of Law gate on lawfulness, not goodness. ────

/** Church & Crown demand order: not Chaotic. (Frollo — Lawful Evil — qualifies.) */
export function canHoldLawfulOffice(a: Alignment): boolean {
  return ethicsBand(a) !== 'Chaotic';
}

/** The blade refuses the saint: Shadow Guild rejects the purely Lawful Good. */
export function canJoinShadow(a: Alignment): boolean {
  return !(ethicsBand(a) === 'Lawful' && moralsBand(a) === 'Good');
}
