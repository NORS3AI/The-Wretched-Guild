// Economy & Businesses (§11). Ventures you buy with coin that then earn passively
// each tick — turning "assign yourself to labour" into "own the trade". Legal
// ventures are quiet; illicit ones pay more but generate Heat, which the law
// eventually answers (see lawEnforcement in engine.ts).

import type { RunState } from './types';
import type { FactionId } from './factions';
import { factionById } from './factions';
import { gainStanding } from './helpers';

export interface BusinessDef {
  id: string;
  name: string;
  faction: FactionId;
  blurb: string;
  illicit: boolean;
  baseCost: number;
  costGrowth: number; // cost multiplier per owned level
  incomePerLevel: number; // coin/tick per level
  heatPerLevel: number; // heat/tick per level
  standingPerLevel: number; // faction standing/tick per level
  maxLevel: number;
  reqRank: number;
  reqStanding: number; // in its own faction
}

export const BUSINESSES: BusinessDef[] = [
  {
    id: 'market_stall',
    name: 'Market Stall',
    faction: 'merchants',
    blurb: 'A cart of odds and ends. Honest, unremarkable, and quietly profitable.',
    illicit: false,
    baseCost: 50,
    costGrowth: 2.2,
    incomePerLevel: 0.12,
    heatPerLevel: 0,
    standingPerLevel: 0.03,
    maxLevel: 50,
    reqRank: 1,
    reqStanding: 0,
  },
  {
    id: 'alehouse',
    name: 'The Alehouse',
    faction: 'commons',
    blurb: 'Ale, gossip, and warm bodies. Modest coin and a place to hear things.',
    illicit: false,
    baseCost: 110,
    costGrowth: 2.2,
    incomePerLevel: 0.2,
    heatPerLevel: 0.004,
    standingPerLevel: 0.03,
    maxLevel: 50,
    reqRank: 2,
    reqStanding: 10,
  },
  {
    id: 'fencing_den',
    name: 'Fencing Den',
    faction: 'shadow',
    blurb: 'A back room that turns stolen goods into clean coin. Lucrative — and watched.',
    illicit: true,
    baseCost: 140,
    costGrowth: 2.3,
    incomePerLevel: 0.4,
    heatPerLevel: 0.05,
    standingPerLevel: 0.05,
    maxLevel: 50,
    reqRank: 3,
    reqStanding: 15,
  },
  {
    id: 'craft_shop',
    name: "Craftsman's Shop",
    faction: 'merchants',
    blurb: 'A proper storefront with apprentices. Steady, respectable income.',
    illicit: false,
    baseCost: 240,
    costGrowth: 2.3,
    incomePerLevel: 0.34,
    heatPerLevel: 0.01,
    standingPerLevel: 0.04,
    maxLevel: 50,
    reqRank: 4,
    reqStanding: 20,
  },
  {
    id: 'smugglers_wharf',
    name: "Smuggler's Wharf",
    faction: 'shadow',
    blurb: 'Contraband by the boatload under cover of night. Great wealth, greater risk.',
    illicit: true,
    baseCost: 520,
    costGrowth: 2.4,
    incomePerLevel: 0.9,
    heatPerLevel: 0.13,
    standingPerLevel: 0.06,
    maxLevel: 50,
    reqRank: 7,
    reqStanding: 40,
  },
  {
    id: 'trade_house',
    name: 'Trade House',
    faction: 'merchants',
    blurb: 'Caravans, ledgers, and reach across the shire. The engine of a fortune.',
    illicit: false,
    baseCost: 750,
    costGrowth: 2.4,
    incomePerLevel: 0.75,
    heatPerLevel: 0.03,
    standingPerLevel: 0.05,
    maxLevel: 50,
    reqRank: 8,
    reqStanding: 45,
  },
];

export function businessById(id: string): BusinessDef | undefined {
  return BUSINESSES.find((b) => b.id === id);
}

export function ownedLevel(run: RunState, id: string): number {
  return run.businesses[id] ?? 0;
}

/** Cost to acquire the next level (level 0 → buy at base cost). */
export function nextCost(def: BusinessDef, level: number): number {
  return Math.round(def.baseCost * Math.pow(def.costGrowth, level));
}

export interface Requirements {
  rankOk: boolean;
  standingOk: boolean;
  alignmentOk: boolean;
  ok: boolean;
}

export function meetsRequirements(run: RunState, def: BusinessDef): Requirements {
  const rankOk = run.rank >= def.reqRank;
  const standingOk = run.factions[def.faction] >= def.reqStanding;
  const alignmentOk = factionById(def.faction).admits(run.alignment);
  return { rankOk, standingOk, alignmentOk, ok: rankOk && standingOk && alignmentOk };
}

export function canInvest(run: RunState, def: BusinessDef): boolean {
  const level = ownedLevel(run, def.id);
  if (level >= def.maxLevel) return false;
  if (!meetsRequirements(run, def).ok) return false;
  return run.coin >= nextCost(def, level);
}

/** Buy or upgrade. Returns true if the transaction happened. */
export function invest(run: RunState, id: string): boolean {
  const def = businessById(id);
  if (!def || !canInvest(run, def)) return false;
  const level = ownedLevel(run, id);
  run.coin -= nextCost(def, level);
  run.businesses[id] = level + 1;
  return true;
}

/** Total passive coin/tick across all owned ventures — for the UI summary. */
export function totalIncomePerTick(run: RunState): number {
  let sum = 0;
  for (const def of BUSINESSES) {
    const level = ownedLevel(run, def.id);
    if (level > 0) sum += def.incomePerLevel * level;
  }
  return sum;
}

/** Run every owned venture for one tick: income, Heat, and faction standing. */
export function processBusinesses(run: RunState): void {
  for (const def of BUSINESSES) {
    const level = ownedLevel(run, def.id);
    if (level <= 0) continue;
    run.coin += def.incomePerLevel * level;
    if (def.heatPerLevel > 0) run.heat = Math.min(100, run.heat + def.heatPerLevel * level);
    if (def.standingPerLevel > 0) gainStanding(run, def.faction, def.standingPerLevel * level);
  }
}
