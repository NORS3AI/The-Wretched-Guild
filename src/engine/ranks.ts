// The rank ladder (§13) — the spine and pacing dial. Promotion is gated by
// converging requirements: coin (rising steeply) + your highest faction standing
// + (at higher rungs) a *second* faction's standing, forcing breadth. Crossing
// into each new band demands a Rite of Passage — an RPG-dialogue Encounter where
// you choose *how* you rise (see milestones.ts). Titles are themed by your
// dominant faction, so a Church run and a Shadow run climb the same rungs by
// different names.

import type { FactionId } from './factions';
import type { RunState } from './types';
import { dominantFaction, peakStanding, secondPeakStanding } from './factions';
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
  minStanding: number; // highest single faction
  minSecond: number; // second-highest faction (breadth)
}

// Requirements to advance INTO rank r (index r). Index 1 is the starting rank.
const REQS: RankReq[] = [
  { minCoin: 0, minStanding: 0, minSecond: 0 }, // 0 unused
  { minCoin: 0, minStanding: 0, minSecond: 0 }, // 1 start
  { minCoin: 3, minStanding: 0, minSecond: 0 }, // 2
  { minCoin: 12, minStanding: 4, minSecond: 0 }, // 3
  { minCoin: 30, minStanding: 9, minSecond: 0 }, // 4
  { minCoin: 60, minStanding: 15, minSecond: 0 }, // 5
  { minCoin: 120, minStanding: 21, minSecond: 0 }, // 6 · rite
  { minCoin: 200, minStanding: 28, minSecond: 0 }, // 7
  { minCoin: 320, minStanding: 35, minSecond: 0 }, // 8
  { minCoin: 480, minStanding: 43, minSecond: 0 }, // 9
  { minCoin: 700, minStanding: 50, minSecond: 0 }, // 10
  { minCoin: 1000, minStanding: 56, minSecond: 0 }, // 11 · rite
  { minCoin: 1400, minStanding: 62, minSecond: 0 }, // 12
  { minCoin: 1900, minStanding: 68, minSecond: 0 }, // 13
  { minCoin: 2600, minStanding: 74, minSecond: 0 }, // 14
  { minCoin: 3500, minStanding: 80, minSecond: 0 }, // 15
  { minCoin: 4800, minStanding: 84, minSecond: 20 }, // 16 · rite
  { minCoin: 6500, minStanding: 88, minSecond: 26 }, // 17
  { minCoin: 8800, minStanding: 90, minSecond: 32 }, // 18
  { minCoin: 12000, minStanding: 92, minSecond: 38 }, // 19
  { minCoin: 16000, minStanding: 94, minSecond: 44 }, // 20
  { minCoin: 21000, minStanding: 95, minSecond: 50 }, // 21 · rite
  { minCoin: 28000, minStanding: 96, minSecond: 55 }, // 22
  { minCoin: 37000, minStanding: 97, minSecond: 60 }, // 23
  { minCoin: 49000, minStanding: 98, minSecond: 66 }, // 24
  { minCoin: 64000, minStanding: 99, minSecond: 72 }, // 25
  { minCoin: 82000, minStanding: 100, minSecond: 78 }, // 26 · rite
  { minCoin: 105000, minStanding: 100, minSecond: 84 }, // 27
  { minCoin: 132000, minStanding: 100, minSecond: 88 }, // 28
  { minCoin: 165000, minStanding: 100, minSecond: 92 }, // 29
  { minCoin: 205000, minStanding: 100, minSecond: 96 }, // 30
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
  peak: number;
  second: number;
  coinMet: boolean;
  standingMet: boolean;
  secondMet: boolean;
  eligible: boolean;
  milestone: string | null;
  milestonePassed: boolean;
}

/** Everything the UI needs to show the advancement state. */
export function advancement(run: RunState): Advancement {
  const peak = peakStanding(run.factions);
  const second = secondPeakStanding(run.factions);
  if (run.rank >= MAX_RANK) {
    return { atMax: true, nextRank: null, req: null, peak, second, coinMet: false, standingMet: false, secondMet: false, eligible: false, milestone: null, milestonePassed: true };
  }
  const next = run.rank + 1;
  const req = REQS[next];
  const coinMet = run.coin >= req.minCoin;
  const standingMet = peak >= req.minStanding;
  const secondMet = second >= req.minSecond;
  const milestone = MILESTONE_RANKS[next] ?? null;
  const milestonePassed = milestone ? !!run.milestones[milestone] : true;
  return {
    atMax: false,
    nextRank: next,
    req,
    peak,
    second,
    coinMet,
    standingMet,
    secondMet,
    eligible: coinMet && standingMet && secondMet,
    milestone,
    milestonePassed,
  };
}

/** Advance one rung, marking a rite passed if one gated it. Used by both the
 *  direct promotion path and the Rite of Passage encounters. */
export function completeAdvance(run: RunState, milestoneId?: string): void {
  if (milestoneId) run.milestones[milestoneId] = true;
  run.rank = Math.min(MAX_RANK, run.rank + 1);
  pushLog(run, `You rise in the world — you are now a ${rankTitle(run)} (rank ${run.rank}).`, 'good');
}
