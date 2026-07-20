// The rank ladder (§13) — the spine and pacing dial. Promotion is gated by
// converging requirements: coin (rising steeply) + your highest faction standing
// + (at higher rungs) a *second* faction's standing, forcing breadth. Crossing
// into each new band demands a Rite of Passage — an RPG-dialogue Encounter where
// you choose *how* you rise (see milestones.ts). Titles are themed by your
// dominant faction, so a Church run and a Shadow run climb the same rungs by
// different names.

import type { FactionId } from './factions';
import type { RunState } from './types';
import { dominantFaction, combinedStanding, spendCombinedStanding } from './factions';
import { pushLog } from './helpers';

export const MAX_RANK = 30; // the slice populates the first six bands

interface Band {
  name: string;
  fromRank: number;
  toRank: number;
  generic: string;
  titles: Record<FactionId, string>;
}

const BANDS: Band[] = [
  {
    name: 'The Destitute',
    fromRank: 1,
    toRank: 5,
    generic: 'Beggar',
    titles: { commons: 'Gutter Labourer', shadow: 'Cutpurse', church: 'Almstaker', merchants: 'Hawker', crown: 'Lowly Servant' },
  },
  {
    name: 'The Risen',
    fromRank: 6,
    toRank: 10,
    generic: 'Vagabond',
    titles: { commons: 'Freeholder', shadow: 'Footpad', church: 'Lay Brother', merchants: 'Peddler', crown: 'Retainer' },
  },
  {
    name: 'The Established',
    fromRank: 11,
    toRank: 15,
    generic: 'Journeyman',
    titles: { commons: 'Yeoman', shadow: 'Fence', church: 'Acolyte', merchants: 'Shopkeeper', crown: 'Squire' },
  },
  {
    name: 'The Notable',
    fromRank: 16,
    toRank: 20,
    generic: 'Goodman',
    titles: { commons: 'Reeve', shadow: 'Bravo', church: 'Deacon', merchants: 'Merchant', crown: 'Knight' },
  },
  {
    name: 'The Powerful',
    fromRank: 21,
    toRank: 25,
    generic: 'Master',
    titles: { commons: 'Bailiff', shadow: 'Spymaster', church: 'Priest', merchants: 'Magnate', crown: 'Baron' },
  },
  {
    name: 'The Elite',
    fromRank: 26,
    toRank: 30,
    generic: 'Grandee',
    titles: { commons: 'High Steward', shadow: 'Guildlord', church: 'Bishop', merchants: 'Guild Master', crown: 'Earl' },
  },
];

export interface RankReq {
  minCoin: number;
  minCombined: number; // total standing summed across ALL factions
}

// Requirements to advance INTO rank r (index r). Index 1 is the starting rank.
// Both the coin and the combined standing are SPENT on advancement (see
// completeAdvance) — rising in the world costs what it demands.
const REQS: RankReq[] = [
  { minCoin: 0, minCombined: 0 }, // 0 unused
  { minCoin: 0, minCombined: 0 }, // 1 start
  { minCoin: 15, minCombined: 0 }, // 2 — beggar → next: 15 coppers
  { minCoin: 12, minCombined: 4 }, // 3
  { minCoin: 30, minCombined: 9 }, // 4
  { minCoin: 60, minCombined: 15 }, // 5
  { minCoin: 120, minCombined: 21 }, // 6 · rite
  { minCoin: 200, minCombined: 28 }, // 7
  { minCoin: 320, minCombined: 35 }, // 8
  { minCoin: 480, minCombined: 43 }, // 9
  { minCoin: 700, minCombined: 50 }, // 10
  { minCoin: 1000, minCombined: 56 }, // 11 · rite
  { minCoin: 1400, minCombined: 62 }, // 12
  { minCoin: 1900, minCombined: 68 }, // 13
  { minCoin: 2600, minCombined: 74 }, // 14
  { minCoin: 3500, minCombined: 80 }, // 15
  { minCoin: 4800, minCombined: 104 }, // 16 · rite
  { minCoin: 6500, minCombined: 114 }, // 17
  { minCoin: 8800, minCombined: 122 }, // 18
  { minCoin: 12000, minCombined: 130 }, // 19
  { minCoin: 16000, minCombined: 138 }, // 20
  { minCoin: 21000, minCombined: 145 }, // 21 · rite
  { minCoin: 28000, minCombined: 151 }, // 22
  { minCoin: 37000, minCombined: 157 }, // 23
  { minCoin: 49000, minCombined: 164 }, // 24
  { minCoin: 64000, minCombined: 171 }, // 25
  { minCoin: 82000, minCombined: 178 }, // 26 · rite
  { minCoin: 105000, minCombined: 184 }, // 27
  { minCoin: 132000, minCombined: 188 }, // 28
  { minCoin: 165000, minCombined: 192 }, // 29
  { minCoin: 205000, minCombined: 196 }, // 30
];

/** Rank → the Rite of Passage encounter that must be undertaken to enter it. */
export const MILESTONE_RANKS: Record<number, string> = {
  6: 'rite_crossroads',
  11: 'rite_master',
  16: 'rite_trial',
  21: 'rite_gambit',
  26: 'rite_ascent',
};

function bandOf(rank: number): Band {
  return BANDS.find((b) => rank >= b.fromRank && rank <= b.toRank) ?? BANDS[BANDS.length - 1];
}

export function rankTitle(run: RunState): string {
  const band = bandOf(run.rank);
  const dom = dominantFaction(run.factions);
  return dom ? band.titles[dom] : band.generic;
}

export function bandName(rank: number): string {
  return bandOf(rank).name;
}

export interface Advancement {
  atMax: boolean;
  nextRank: number | null;
  req: RankReq | null;
  combined: number;
  coinMet: boolean;
  standingMet: boolean;
  eligible: boolean;
  milestone: string | null;
  milestonePassed: boolean;
}

/** Everything the UI needs to show the advancement state. */
export function advancement(run: RunState): Advancement {
  const combined = combinedStanding(run.factions);
  if (run.rank >= MAX_RANK) {
    return { atMax: true, nextRank: null, req: null, combined, coinMet: false, standingMet: false, eligible: false, milestone: null, milestonePassed: true };
  }
  const next = run.rank + 1;
  const req = REQS[next];
  const coinMet = run.coin >= req.minCoin;
  const standingMet = combined >= req.minCombined;
  const milestone = MILESTONE_RANKS[next] ?? null;
  const milestonePassed = milestone ? !!run.milestones[milestone] : true;
  return {
    atMax: false,
    nextRank: next,
    req,
    combined,
    coinMet,
    standingMet,
    eligible: coinMet && standingMet,
    milestone,
    milestonePassed,
  };
}

/** Advance one rung, marking a rite passed if one gated it. The rank's cost —
 *  its required coin AND combined standing — is SPENT here. Used by both the
 *  direct promotion path and the Rite of Passage encounters. */
export function completeAdvance(run: RunState, milestoneId?: string): void {
  const next = Math.min(MAX_RANK, run.rank + 1);
  const req = REQS[next];
  if (req) {
    run.coin = Math.max(0, run.coin - req.minCoin);
    spendCombinedStanding(run.factions, req.minCombined);
  }
  if (milestoneId) run.milestones[milestoneId] = true;
  run.rank = next;
  pushLog(run, `You rise in the world — you are now a ${rankTitle(run)} (rank ${run.rank}).`, 'good');
}
