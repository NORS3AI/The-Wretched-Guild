// Permadeath & Legacy (§4). Death ends the run; the Guild endures and grows.

import type { GameState, RunState } from './types';
import { pushLog } from './helpers';

/** Legacy from the coin a life amassed. A gentle, denomination-scaled schedule so
 *  wealth no longer floods Legacy the moment you pass a silver: each thousand-fold
 *  band converts at "1 Legacy per 1,000 of that denomination" —
 *    1,000 copper → 1, 1,000 shillings → +1, 1,000 silver → +1, … up through gold,
 *  then platinum at the far top gives 1 Legacy per 5,000. (Denominations above
 *  platinum aren't in play yet.) Each band thus adds at most ~1 Legacy, so coin is
 *  a slow logarithmic bonus rather than the whole of a life's Legacy. */
const LEGACY_BANDS: { lo: number; perLegacy: number }[] = [
  { lo: 0, perLegacy: 1e3 }, // copper band:   1 Legacy / 1,000 copper
  { lo: 1e3, perLegacy: 1e6 }, // shilling band: 1 Legacy / 1,000 shillings
  { lo: 1e6, perLegacy: 1e9 }, // silver band:   1 Legacy / 1,000 silver
  { lo: 1e9, perLegacy: 1e12 }, // crown band:    1 Legacy / 1,000 crowns
  { lo: 1e12, perLegacy: 1e15 }, // triton band:   1 Legacy / 1,000 tritons
  { lo: 1e15, perLegacy: 1e18 }, // gold band:     1 Legacy / 1,000 gold
  { lo: 1e18, perLegacy: 5e21 }, // platinum+:     1 Legacy / 5,000 platinum
];

export function legacyFromCoin(coin: number): number {
  const amt = Math.max(0, Math.floor(coin));
  let legacy = 0;
  for (let i = 0; i < LEGACY_BANDS.length; i++) {
    const lo = LEGACY_BANDS[i].lo;
    if (amt <= lo) break;
    const hi = i + 1 < LEGACY_BANDS.length ? LEGACY_BANDS[i + 1].lo : Infinity;
    const inBand = Math.min(amt, hi) - lo; // copper falling in this band
    legacy += inBand / LEGACY_BANDS[i].perLegacy;
  }
  return Math.floor(legacy);
}

/** Legacy earned by a life: reward wealth, longevity, and how high you climbed
 *  the ladder. */
export function computeLegacy(run: RunState): number {
  const fromCoin = legacyFromCoin(run.coin);
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
  if (game.settings?.godMode) return; // dev god mode — death is disabled
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
