// The rank ladder (§13) — 100 named rungs from Beggar to King of England.
// Advancement is gated by, and SPENDS, converging costs: coin, combined faction
// standing, and (from rung 4 up) gathered resources turned in from your pockets.
// Band boundaries (6, 11, 16, 21, 26) demand a Rite of Passage (see milestones).

import type { RunState } from './types';
import { combinedStanding, spendCombinedStanding } from './factions';
import { countItem, removeItem } from './items';
import { pushLog } from './helpers';

export const MAX_RANK = 100;

// ── Names ─────────────────────────────────────────────────────────────────────

// 0-indexed: RANK_NAMES[rank - 1].
const RANK_NAMES: string[] = [
  'Beggar', 'Vagrant', 'Cutpurse', 'Footpad', 'Pickpocket', // 1–5
  'Cottar', 'Serf', 'Bondsman', 'Peasant', 'Labourer', // 6–10
  'Swineherd', 'Shepherd', 'Ploughman', 'Fisherman', 'Woodward', // 11–15
  'Charcoaler', 'Tanner', 'Miller', 'Cottager', 'Freeholder', // 16–20
  'Apprentice', 'Journeyman', 'Craftsman', 'Yeoman', 'Franklin', // 21–25
  'Tradesman', 'Pedlar', 'Chapman', 'Shopkeeper', 'Merchant', // 26–30
  'Vintner', 'Draper', 'Mercer', 'Goldsmith', 'Burgess', // 31–35
  'Freeman', 'Alderman', 'Guildsman', 'Guild Warden', 'Guild Master', // 36–40
  'Bailiff', 'Reeve', 'Constable', 'Beadle', 'Serjeant', // 41–45
  "Sheriff's Man", 'Under-Sheriff', 'Sheriff', 'Coroner', 'Justice of the Peace', // 46–50
  'Esquire', 'Squire', 'Man-at-Arms', 'Household Knight', 'Knight', // 51–55
  'Knight Bachelor', 'Knight Banneret', 'Lord of the Manor', 'Castellan', 'Baronet', // 56–60
  'Baron', 'Feudal Baron', 'Lord Baron', 'Viscount', 'Earl', // 61–65
  'Marquess', 'Duke', 'Grand Duke', 'Lord Warden', 'Lord Marcher', // 66–70
  'Steward', 'Chamberlain', 'Seneschal', 'Marshal', 'High Constable', // 71–75
  'Privy Councillor', "King's Councillor", 'Chancellor', 'Lord Chancellor', 'Lord Treasurer', // 76–80
  'Lord Privy Seal', 'Lord President', 'Lord High Steward', 'Lord Great Chamberlain', 'Earl Marshal', // 81–85
  'Lord High Constable', 'Lord High Admiral', 'Duke Royal', 'Prince of the Blood', 'Prince', // 86–90
  'Royal Prince', 'Crown Prince', 'Heir Presumptive', 'Heir Apparent', 'Prince Regent', // 91–95
  'Lord Protector', 'Regent', 'Pretender to the Throne', 'King-Elect', 'King of England', // 96–100
];

interface Band {
  name: string;
  from: number;
  to: number;
}
const BANDS: Band[] = [
  { name: 'The Destitute', from: 1, to: 5 },
  { name: 'The Bound', from: 6, to: 20 },
  { name: 'The Tradesfolk', from: 21, to: 40 },
  { name: 'The Officers', from: 41, to: 50 },
  { name: 'The Knightly', from: 51, to: 60 },
  { name: 'The Nobility', from: 61, to: 70 },
  { name: 'The Great Officers', from: 71, to: 87 },
  { name: 'The Blood Royal', from: 88, to: 95 },
  { name: 'The Crown', from: 96, to: 100 },
];

export function rankTitle(run: RunState): string {
  const i = Math.max(0, Math.min(RANK_NAMES.length - 1, run.rank - 1));
  return RANK_NAMES[i];
}

export function bandName(rank: number): string {
  return (BANDS.find((b) => rank >= b.from && rank <= b.to) ?? BANDS[BANDS.length - 1]).name;
}

// ── Requirements (formula-driven, and SPENT on advance) ─────────────────────────

export interface ItemReq {
  item: string;
  qty: number;
}
export interface RankReq {
  minCoin: number;
  minCombined: number;
  items: ItemReq[];
}

const RESOURCE_CYCLE = ['firewood', 'fish', 'herbs', 'scrap', 'roots', 'wooden_log'];

function reqCoin(r: number): number {
  if (r <= 1) return 0;
  if (r === 2) return 15;
  if (r === 3) return 25;
  return Math.round(40 * Math.pow(1.3, r - 4)); // steep from rung 4 up
}

function reqCombined(r: number): number {
  if (r < 4) return 0;
  return Math.round(Math.min(460, (r - 3) * 5));
}

// From rung 4, turn in gathered resources (kept in your two pockets). Higher
// rungs demand a second kind too — using both pockets.
function reqItems(r: number): ItemReq[] {
  if (r < 4) return [];
  const items: ItemReq[] = [
    { item: RESOURCE_CYCLE[r % RESOURCE_CYCLE.length], qty: Math.min(5, 1 + Math.floor(r / 10)) },
  ];
  if (r >= 20) {
    items.push({ item: RESOURCE_CYCLE[(r + 3) % RESOURCE_CYCLE.length], qty: Math.min(5, 1 + Math.floor(r / 14)) });
  }
  return items;
}

export function reqFor(rank: number): RankReq {
  return { minCoin: reqCoin(rank), minCombined: reqCombined(rank), items: reqItems(rank) };
}

/** Rank → the Rite of Passage encounter needed to enter it. */
export const MILESTONE_RANKS: Record<number, string> = {
  6: 'rite_crossroads',
  11: 'rite_master',
  16: 'rite_trial',
  21: 'rite_gambit',
  26: 'rite_ascent',
};

// ── Advancement ─────────────────────────────────────────────────────────────

export interface Advancement {
  atMax: boolean;
  nextRank: number | null;
  req: RankReq | null;
  combined: number;
  coinMet: boolean;
  standingMet: boolean;
  /** per-required-item progress, for the UI */
  itemStatus: { item: string; have: number; need: number; met: boolean }[];
  itemsMet: boolean;
  eligible: boolean;
  milestone: string | null;
  milestonePassed: boolean;
}

/** `freeReqs` (the dev "Free advancement" toggle) reports every numeric
 *  requirement as already met, so the player can exercise the real Seek
 *  Advancement flow — Rites of Passage and all — without grinding the costs. */
export function advancement(run: RunState, freeReqs = false): Advancement {
  const combined = combinedStanding(run.factions);
  if (run.rank >= MAX_RANK) {
    return { atMax: true, nextRank: null, req: null, combined, coinMet: false, standingMet: false, itemStatus: [], itemsMet: false, eligible: false, milestone: null, milestonePassed: true };
  }
  const next = run.rank + 1;
  const req = reqFor(next);
  const coinMet = freeReqs || run.coin >= req.minCoin;
  const standingMet = freeReqs || combined >= req.minCombined;
  const itemStatus = req.items.map((it) => {
    const have = countItem(run, it.item);
    return { item: it.item, have, need: it.qty, met: freeReqs || have >= it.qty };
  });
  const itemsMet = itemStatus.every((s) => s.met);
  const milestone = MILESTONE_RANKS[next] ?? null;
  const milestonePassed = milestone ? !!run.milestones[milestone] : true;
  return {
    atMax: false,
    nextRank: next,
    req,
    combined,
    coinMet,
    standingMet,
    itemStatus,
    itemsMet,
    eligible: coinMet && standingMet && itemsMet,
    milestone,
    milestonePassed,
  };
}

/** Advance one rung, SPENDING the rank's cost — coin, combined standing, and the
 *  required resources turned in from the pockets. Used by both the direct
 *  promotion and the Rite of Passage encounters. */
export function completeAdvance(run: RunState, milestoneId?: string): void {
  const next = Math.min(MAX_RANK, run.rank + 1);
  const req = reqFor(next);
  run.coin = Math.max(0, run.coin - req.minCoin);
  spendCombinedStanding(run.factions, req.minCombined);
  for (const it of req.items) removeItem(run, it.item, it.qty);
  if (milestoneId) run.milestones[milestoneId] = true;
  run.rank = next;
  pushLog(run, `You rise in the world — you are now a ${rankTitle(run)} (rank ${run.rank}).`, 'good');
}

/** Dev-only: rise one rung at no cost and with no Rite — the auto-rank-up cheat.
 *  Any Rite of Passage for the new rung is marked passed automatically. */
export function devAdvance(run: RunState): void {
  if (run.rank >= MAX_RANK) return;
  const next = run.rank + 1;
  const milestone = MILESTONE_RANKS[next];
  if (milestone) run.milestones[milestone] = true;
  run.rank = next;
  pushLog(run, `You rise in the world — you are now a ${rankTitle(run)} (rank ${run.rank}).`, 'good');
}
