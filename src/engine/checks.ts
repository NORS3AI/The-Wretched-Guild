// The risk roll (§10): Success / Complication / Disaster, weighted by a skill,
// the task's difficulty, and current Heat.

import type { RunState } from './types';
import { nextFloat } from './rng';

export type RollTier = 'success' | 'complication' | 'disaster';

export interface RollResult {
  tier: RollTier;
  /** the rolled float, for logging/tuning */
  roll: number;
  /** success probability that was in effect */
  chance: number;
}

/** skill ~0..40, difficulty ~0..40. Heat pushes outcomes toward disaster. */
export function riskRoll(run: RunState, skill: number, difficulty: number): RollResult {
  const heatPenalty = run.heat / 250; // up to -0.4 at max heat
  let successChance = 0.5 + (skill - difficulty) * 0.025 - heatPenalty;
  successChance = Math.max(0.05, Math.min(0.95, successChance));

  const roll = nextFloat(run);
  let tier: RollTier;
  if (roll < successChance) {
    tier = 'success';
  } else if (roll < successChance + (1 - successChance) * 0.55) {
    tier = 'complication';
  } else {
    tier = 'disaster';
  }
  return { tier, roll, chance: successChance };
}
