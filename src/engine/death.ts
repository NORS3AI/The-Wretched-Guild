// Permadeath & Legacy (§4). Death ends the run; the Guild endures and grows.

import type { GameState, RunState } from './types';
import { pushLog } from './helpers';

/** Legacy earned by a life: reward reaching wealth and surviving long. */
export function computeLegacy(run: RunState): number {
  const fromCoin = Math.floor(run.coin / 8);
  const fromAge = Math.max(0, run.ageYears - 16);
  return fromCoin + fromAge;
}

/** How much coin the Guild vault keeps across death. */
export function computeVaultCarry(run: RunState): number {
  return Math.floor(run.coin * 0.15);
}

export function die(game: GameState, run: RunState, cause: string): void {
  if (!run.alive) return;
  run.alive = false;
  run.deathCause = cause;
  run.health = 0;
  run.activity = null;
  run.encounter = null;

  const legacy = computeLegacy(run);
  run.legacyThisRun = legacy;

  pushLog(run, `You are dead — ${cause}. (Age ${run.ageYears})`, 'death');
  pushLog(run, `The Wretched Guild remembers. ${legacy} Legacy passes on.`, 'system');
}

/** Fold a finished life's spoils into the persistent Guild, then it's ready to
 *  seed the next run via newRun(meta). */
export function commitToMeta(game: GameState): void {
  const run = game.run;
  game.meta.legacy += run.legacyThisRun;
  game.meta.vault += computeVaultCarry(run);
  game.meta.runsCompleted += 1;
  game.meta.bestAge = Math.max(game.meta.bestAge, run.ageYears);
  game.meta.bestCoin = Math.max(game.meta.bestCoin, run.coin);
}
