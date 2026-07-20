// Meta-progression catalog (§4). Legacy (common) or Wretched Tokens (rare) spent
// here permanently shapes every future life. Unlocks are LEVELED: each has a
// ladder of costs, and buying the next level grants another increment of its
// effect (another heart, more starting Luck, …). Kept as data so the roster
// grows without engine edits.

export type UnlockCurrency = 'legacy' | 'tokens';

export interface UnlockDef {
  id: string;
  name: string;
  currency: UnlockCurrency;
  /** cost of each successive level; its length is the maximum level */
  costs: number[];
  /** what one level grants, for the UI (e.g. "+1 heart") */
  perLevel: string;
  blurb: string;
}

export const META_UNLOCKS: UnlockDef[] = [
  {
    id: 'stashed_coin',
    name: 'A Coin in the Lining',
    currency: 'legacy',
    costs: [5],
    perLevel: '+15 copper at birth',
    blurb: 'The Guild slips every new wretch 15 copper to start. Begin each life a little less desperate.',
  },
  {
    id: 'hardened',
    name: 'Hardened Stock',
    currency: 'legacy',
    costs: [8, 50, 300, 800, 3000, 15000, 50000],
    perLevel: '+1 heart',
    blurb: 'The Guild toughens its recruits. Each level grants every future life one more heart.',
  },
  {
    id: 'beggars_luck',
    name: "Beggar's Luck",
    currency: 'legacy',
    costs: [1, 1, 2, 3, 5, 10, 25, 60, 150, 400, 900, 2000, 5000, 15000, 45000, 100000],
    perLevel: '+2 Luck',
    blurb: 'A Wretched blessing. Each level begins every future life with +2 Luck — the gutter grows kinder to you.',
  },
];

export function unlockById(id: string): UnlockDef | undefined {
  return META_UNLOCKS.find((u) => u.id === id);
}

export function unlockMaxLevel(def: UnlockDef): number {
  return def.costs.length;
}

/** Cost of the next level up from `level`, or null if already maxed. */
export function unlockNextCost(def: UnlockDef, level: number): number | null {
  return level < def.costs.length ? def.costs[level] : null;
}
