// Economy & Businesses (§11). Ventures you buy with coin that then earn passively
// each tick — turning "assign yourself to labour" into "own the trade". Legal
// ventures are quiet; illicit ones pay more but generate Heat, which the law
// eventually answers (see lawEnforcement in engine.ts).

import type { AttrKey, RunState } from './types';
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
  reqStanding: number; // in its own faction
  /** base coin per cycle when the player WORKS the enterprise (before the
   *  ×(1.5 + 0.5·level) ownership multiplier); the attribute working trains */
  workYield: [number, number];
  workTrains: AttrKey;
  /** the verb shown on the work button, e.g. "Work", "Tend", "Run" */
  workVerb: string;
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
    reqStanding: 0,
    workYield: [1, 4],
    workTrains: 'wits',
    workVerb: 'Work',
  },
  {
    id: 'alehouse',
    name: 'The Alehouse',
    faction: 'commons',
    blurb: 'Ale, gossip, and warm bodies. Modest coin and a place to hear things.',
    illicit: false,
    baseCost: 250,
    costGrowth: 2.2,
    incomePerLevel: 0.2,
    heatPerLevel: 0.004,
    standingPerLevel: 0.03,
    maxLevel: 50,
    reqStanding: 10,
    workYield: [2, 6],
    workTrains: 'charm',
    workVerb: 'Tend',
  },
  {
    id: 'fencing_den',
    name: 'Fencing Den',
    faction: 'shadow',
    blurb: 'A back room that turns stolen goods into clean coin. Lucrative — and watched.',
    illicit: true,
    baseCost: 2000,
    costGrowth: 2.3,
    incomePerLevel: 0.4,
    heatPerLevel: 0.05,
    standingPerLevel: 0.05,
    maxLevel: 50,
    reqStanding: 15,
    workYield: [3, 8],
    workTrains: 'stealth',
    workVerb: 'Run',
  },
  {
    id: 'craft_shop',
    name: "Craftsman's Shop",
    faction: 'merchants',
    blurb: 'A proper storefront with apprentices. Steady, respectable income.',
    illicit: false,
    baseCost: 5_000_000,
    costGrowth: 2.3,
    incomePerLevel: 0.34,
    heatPerLevel: 0.01,
    standingPerLevel: 0.04,
    maxLevel: 50,
    reqStanding: 20,
    workYield: [3, 7],
    workTrains: 'wits',
    workVerb: 'Run',
  },
  {
    id: 'smugglers_wharf',
    name: "Smuggler's Wharf",
    faction: 'shadow',
    blurb: 'Contraband by the boatload under cover of night. Great wealth, greater risk.',
    illicit: true,
    baseCost: 1_000_000_000,
    costGrowth: 2.4,
    incomePerLevel: 0.9,
    heatPerLevel: 0.13,
    standingPerLevel: 0.06,
    maxLevel: 50,
    reqStanding: 40,
    workYield: [5, 12],
    workTrains: 'stealth',
    workVerb: 'Run',
  },
  {
    id: 'trade_house',
    name: 'Trade House',
    faction: 'merchants',
    blurb: 'Caravans, ledgers, and reach across the shire. The engine of a fortune.',
    illicit: false,
    baseCost: 200_000_000_000_000,
    costGrowth: 2.4,
    incomePerLevel: 0.75,
    heatPerLevel: 0.03,
    standingPerLevel: 0.05,
    maxLevel: 50,
    reqStanding: 45,
    workYield: [6, 14],
    workTrains: 'wits',
    workVerb: 'Run',
  },
];

/** The Enterprises panel stays hidden until the player can afford the cheapest
 *  venture (the Market Stall's base cost). */
export const ENTERPRISE_MIN_COIN = 50;

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
  standingOk: boolean;
  alignmentOk: boolean;
  ok: boolean;
}

/** The non-coin prerequisites: standing in the venture's faction, and that faction
 *  being willing to admit your bearing. (Attributes and rank are no longer gates.) */
export function meetsRequirements(run: RunState, def: BusinessDef): Requirements {
  const standingOk = run.factions[def.faction] >= def.reqStanding;
  const alignmentOk = factionById(def.faction).admits(run.alignment);
  return { standingOk, alignmentOk, ok: standingOk && alignmentOk };
}

/** Enterprises the player may see: those already owned, or whose Base Cost the
 *  player can afford AND whose faction standing (and alignment) is met. */
export function visibleBusinesses(run: RunState): BusinessDef[] {
  return BUSINESSES.filter(
    (b) => ownedLevel(run, b.id) > 0 || (meetsRequirements(run, b).ok && run.coin >= b.baseCost),
  );
}

/** Does the player own any enterprise at all? (Owning one ends the begging life.) */
export function ownsAnyBusiness(run: RunState): boolean {
  return BUSINESSES.some((b) => ownedLevel(run, b.id) > 0);
}

/** The ownership yield multiplier when working an enterprise: ×2 at L1, ×2.5 at
 *  L2, ×3 at L3 … (×(1.5 + 0.5·level)). */
export function workMultiplier(level: number): number {
  return level >= 1 ? 1.5 + 0.5 * level : 1;
}

/** Ticks a single "work the enterprise" cycle takes. */
export const WORK_TICKS = 7;

/** Average coin per tick earned while actively working an enterprise, so the UI
 *  can show the boost over passive income. */
export function workCoinPerTick(def: BusinessDef, level: number): number {
  if (level < 1) return 0;
  const avgBase = (def.workYield[0] + def.workYield[1]) / 2;
  return (avgBase * workMultiplier(level)) / WORK_TICKS;
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
