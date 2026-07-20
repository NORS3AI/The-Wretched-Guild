// Meta-progression catalog (§4). Legacy spent here permanently shapes every
// future life. Kept as data so the roster of unlocks grows without engine edits.

export interface UnlockDef {
  id: string;
  name: string;
  cost: number; // in Legacy
  blurb: string;
}

export const META_UNLOCKS: UnlockDef[] = [
  {
    id: 'stashed_coin',
    name: 'A Coin in the Lining',
    cost: 5,
    blurb: 'The Guild slips every new wretch 10 coin to start. Begin each life a little less desperate.',
  },
  {
    id: 'hardened',
    name: 'Hardened Stock',
    cost: 8,
    blurb: 'The Guild only recruits survivors now. Every life begins with +10 maximum Health.',
  },
];
