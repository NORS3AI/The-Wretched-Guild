// Semi-upgrades — "teachings" a wretch can pick up (usually by wandering) that
// permanently help *this life*: better luck, faster learning, hardier against
// cold, and so on. They stack with attributes but are qualitative perks.

import type { RunState } from './types';
import { nextInt } from './rng';

export interface Learning {
  id: string;
  name: string;
  blurb: string;
}

export const LEARNINGS: Learning[] = [
  { id: 'sharp_eye', name: 'A Sharp Eye', blurb: 'You spot opportunity where others see only mud. Wandering finds more.' },
  { id: 'street_smart', name: 'Street-Smart', blurb: 'You read a crowd and dodge trouble. Fewer beatings and robberies.' },
  { id: 'quick_study', name: 'A Quick Study', blurb: 'Everything you do teaches you faster. Attributes grow more quickly.' },
  { id: 'hardy', name: 'Hardy', blurb: 'Weather troubles you less. Cold and heat sap your comfort more slowly.' },
  { id: 'iron_stomach', name: 'An Iron Stomach', blurb: 'Foul water and worse food no longer sicken you.' },
];

export function has(run: RunState, id: string): boolean {
  return !!run.learnings[id];
}

export function learningById(id: string): Learning | undefined {
  return LEARNINGS.find((l) => l.id === id);
}

/** A teaching the wretch hasn't picked up yet, or null if they know them all. */
export function randomUnlearned(run: RunState): Learning | null {
  const pool = LEARNINGS.filter((l) => !run.learnings[l.id]);
  if (pool.length === 0) return null;
  return pool[nextInt(run, 0, pool.length - 1)];
}
