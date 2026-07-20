// The rank ladder (§13) — the spine and pacing dial. Promotion is gated by
// converging requirements: coin + your highest faction standing (+ alignment,
// via the faction that admits you). The *title* is themed by your dominant
// faction, so a Church run and a Shadow run climb the same rungs by different
// names — "the same ladder by different rungs".

import type { FactionId } from './factions';
import type { RunState } from './types';
import { dominantFaction, peakStanding } from './factions';

export const MAX_RANK = 15; // the slice populates the first three bands

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
    titles: {
      commons: 'Gutter Labourer',
      shadow: 'Cutpurse',
      church: 'Almstaker',
      merchants: 'Hawker',
      crown: 'Lowly Servant',
    },
  },
  {
    name: 'The Risen',
    fromRank: 6,
    toRank: 10,
    generic: 'Vagabond',
    titles: {
      commons: 'Freeholder',
      shadow: 'Footpad',
      church: 'Lay Brother',
      merchants: 'Peddler',
      crown: 'Retainer',
    },
  },
  {
    name: 'The Established',
    fromRank: 11,
    toRank: 15,
    generic: 'Journeyman',
    titles: {
      commons: 'Yeoman',
      shadow: 'Fence',
      church: 'Acolyte',
      merchants: 'Shopkeeper',
      crown: 'Squire',
    },
  },
];

export interface RankReq {
  minCoin: number;
  minStanding: number;
}

// Requirements to advance INTO rank r (index r). Index 1 is the starting rank
// and needs nothing. Curve ramps coin steeply and standing steadily.
const REQS: RankReq[] = [
  { minCoin: 0, minStanding: 0 }, // 0 — unused
  { minCoin: 0, minStanding: 0 }, // 1 — start
  { minCoin: 3, minStanding: 0 }, // 2
  { minCoin: 10, minStanding: 3 }, // 3
  { minCoin: 25, minStanding: 8 }, // 4
  { minCoin: 45, minStanding: 14 }, // 5
  { minCoin: 75, minStanding: 20 }, // 6
  { minCoin: 110, minStanding: 27 }, // 7
  { minCoin: 160, minStanding: 34 }, // 8
  { minCoin: 220, minStanding: 42 }, // 9
  { minCoin: 300, minStanding: 50 }, // 10
  { minCoin: 400, minStanding: 58 }, // 11
  { minCoin: 520, minStanding: 66 }, // 12
  { minCoin: 680, minStanding: 74 }, // 13
  { minCoin: 880, minStanding: 82 }, // 14
  { minCoin: 1100, minStanding: 90 }, // 15
];

function bandOf(rank: number): Band {
  return BANDS.find((b) => rank >= b.fromRank && rank <= b.toRank) ?? BANDS[BANDS.length - 1];
}

/** The flavour title for a given rank + dominant faction. */
export function rankTitle(run: RunState): string {
  const band = bandOf(run.rank);
  const dom = dominantFaction(run.factions);
  return dom ? band.titles[dom] : band.generic;
}

export function bandName(rank: number): string {
  return bandOf(rank).name;
}

export function reqFor(rank: number): RankReq | null {
  if (rank < 2 || rank > MAX_RANK) return null;
  return REQS[rank];
}

export interface Advancement {
  atMax: boolean;
  nextRank: number | null;
  req: RankReq | null;
  coinMet: boolean;
  standingMet: boolean;
  eligible: boolean;
  peak: number;
}

/** Everything the UI needs to show the "seek advancement" state. */
export function advancement(run: RunState): Advancement {
  if (run.rank >= MAX_RANK) {
    return { atMax: true, nextRank: null, req: null, coinMet: false, standingMet: false, eligible: false, peak: peakStanding(run.factions) };
  }
  const next = run.rank + 1;
  const req = REQS[next];
  const peak = peakStanding(run.factions);
  const coinMet = run.coin >= req.minCoin;
  const standingMet = peak >= req.minStanding;
  return {
    atMax: false,
    nextRank: next,
    req,
    coinMet,
    standingMet,
    eligible: coinMet && standingMet,
    peak,
  };
}
