// Permadeath & Legacy (§4). Death ends the run; the Guild endures and grows.

import type { GameState, RunState } from './types';
import { pushLog } from './helpers';

/** Legacy earned by a life: reward wealth, longevity, and how high you climbed
 *  the ladder. */
export function computeLegacy(run: RunState): number {
  const fromCoin = Math.floor(run.coin / 1000); // 1 Legacy per 1,000 copper held
  const fromAge = Math.floor(Math.max(0, run.ageYears - 16) / 2); // 1 per 2 years past 16
  const fromRank = run.rank - 1; // 1 per rank above Beggar
  return fromCoin + fromAge + fromRank;
}

/** How much coin the Guild vault keeps across death. */
export function computeVaultCarry(run: RunState): number {
  return Math.floor(run.coin * 0.15);
}

/** Wretched Tokens — the rare prestige currency. Weighted by how far you climbed,
 *  how rich you grew, how long you lived, and how broadly you reached — then
 *  rounded to the nearest quarter. A whole token is a genuine achievement; a
 *  great life earns a few, and 10 across the whole save is a fortune. */
export function computeTokens(run: RunState): number {
  let t = 0;

  // the climb — the heaviest weight
  if (run.rank >= 6) t += 0.25;
  if (run.rank >= 11) t += 0.5;
  if (run.rank >= 16) t += 0.75;
  if (run.rank >= 21) t += 1.0;
  if (run.rank >= 26) t += 1.25;
  if (run.rank >= 30) t += 1.5;

  // wealth — by denomination reached
  const peak = run.peakCoin;
  if (peak >= 2_000) t += 0.25; // two shillings
  if (peak >= 100_000) t += 0.5;
  if (peak >= 1_000_000) t += 0.75; // a silver
  if (peak >= 100_000_000) t += 1.0;

  // longevity
  if (run.ageYears >= 45) t += 0.25;
  if (run.ageYears >= 65) t += 0.25;

  // breadth — factions built past real standing
  const broad = (['commons', 'shadow', 'church', 'merchants', 'crown'] as const).filter((f) => run.factions[f] >= 60).length;
  t += broad * 0.25;

  // round to the nearest quarter
  return Math.round(t * 4) / 4;
}

export function die(game: GameState, run: RunState, cause: string): void {
  if (!run.alive) return;
  run.alive = false;
  run.deathCause = cause;
  run.hp = 0;
  run.activity = null;
  run.encounter = null;

  const legacy = computeLegacy(run);
  run.legacyThisRun = legacy;

  pushLog(run, `You are dead — ${cause}. (Age ${run.ageYears})`, 'death');
  pushLog(run, `The Wretched Guild remembers. ${legacy} Legacy passes on.`, 'system');

  // Bank this life's spoils into the persistent Guild AT DEATH, so the player can
  // spend their fresh Legacy and Tokens on the death screen straight away.
  commitToMeta(game);
}

/** Fold a finished life's spoils into the persistent Guild (Legacy, vault coin,
 *  Tokens, and best-of records). Called once, at the moment of death. The run
 *  count is bumped separately when the next life actually begins. */
export function commitToMeta(game: GameState): void {
  const run = game.run;
  game.meta.legacy += run.legacyThisRun;
  game.meta.vault += computeVaultCarry(run);
  game.meta.bestAge = Math.max(game.meta.bestAge, run.ageYears);
  game.meta.bestCoin = Math.max(game.meta.bestCoin, run.peakCoin);
  game.meta.bestRank = Math.max(game.meta.bestRank ?? 1, run.rank);
  game.meta.tokens = Math.round((game.meta.tokens + computeTokens(run)) * 4) / 4;
}
