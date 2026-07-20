// Meta-progression catalog (§4). Legacy (common) or Wretched Tokens (rare) spent
// here permanently shapes every future life. Kept as data so the roster grows
// without engine edits.

export type UnlockCurrency = 'legacy' | 'tokens';

export interface UnlockDef {
  id: string;
  name: string;
  cost: number;
  currency: UnlockCurrency;
  blurb: string;
}

export const META_UNLOCKS: UnlockDef[] = [
  {
    id: 'stashed_coin',
    name: 'A Coin in the Lining',
    cost: 5,
    currency: 'legacy',
    blurb: 'The Guild slips every new wretch 30 copper to start. Begin each life a little less desperate.',
  },
  {
    id: 'hardened',
    name: 'Hardened Stock',
    cost: 8,
    currency: 'legacy',
    blurb: 'The Guild only recruits survivors now. Every life begins with a fourth heart.',
  },
  {
    id: 'beggars_luck',
    name: "Beggar's Luck",
    cost: 1,
    currency: 'tokens',
    blurb: 'A Wretched blessing. Every life begins with markedly better Luck — the gutter is kinder to you.',
  },
];
