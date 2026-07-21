// The coin of the realm. Base unit is COPPER; every denomination is 1000 of the
// one below it. A beggar counts coppers; a king counts diamonds.
//
// copper → shilling → silver → crown → triton → gold → platinum → amethyst →
// topaz → emerald → ruby → sapphire → diamond

export interface Denom {
  name: string;
  short: string;
  value: number; // in copper
}

// Ordered high → low. (Values beyond ~gold exceed JS safe-integer range and are
// only relevant as far-future aspirational wealth; the beggar phase lives in the
// bottom three.)
export const DENOMS: Denom[] = [
  { name: 'diamond', short: 'di', value: 1e36 },
  { name: 'sapphire', short: 'sa', value: 1e33 },
  { name: 'ruby', short: 'ru', value: 1e30 },
  { name: 'emerald', short: 'em', value: 1e27 },
  { name: 'topaz', short: 'to', value: 1e24 },
  { name: 'amethyst', short: 'am', value: 1e21 },
  { name: 'platinum', short: 'pt', value: 1e18 },
  { name: 'gold', short: 'g', value: 1e15 },
  { name: 'triton', short: 'tr', value: 1e12 },
  { name: 'crown', short: 'cr', value: 1e9 },
  { name: 'silver', short: 'si', value: 1e6 },
  { name: 'shilling', short: 's', value: 1e3 },
  { name: 'copper', short: 'c', value: 1 },
];

/** Render a copper amount as up to two highest denominations, short form:
 *  1250 → "1s 250c", 3_000_000 → "3si", 40 → "40c". */
export function formatMoney(copper: number): string {
  const amt = Math.floor(Math.max(0, copper));
  if (amt === 0) return '0c';

  const parts: string[] = [];
  let remaining = amt;
  for (const d of DENOMS) {
    if (remaining >= d.value) {
      const n = Math.floor(remaining / d.value);
      parts.push(`${n}${d.short}`);
      remaining -= n * d.value;
      if (parts.length === 2) break;
    }
  }
  return parts.join(' ');
}

/** The single largest denomination name an amount reaches — for flavour. */
export function highestDenom(copper: number): string {
  const amt = Math.floor(Math.max(0, copper));
  for (const d of DENOMS) {
    if (amt >= d.value) return d.name;
  }
  return 'copper';
}

export interface WealthRung {
  name: string;
  short: string;
  value: number;
  /** name of the denomination one step below (null for copper, the base). */
  below: string | null;
  /** has the player ever amassed at least one of this denomination right now? */
  reached: boolean;
  /** how many whole units of this denomination the amount contains. */
  have: number;
}

/** The full wealth ladder, copper → diamond, tagged with what the given purse has
 *  reached — so the player can see how far their coin climbs and what lies above. */
export function wealthLadder(copper: number): WealthRung[] {
  const amt = Math.floor(Math.max(0, copper));
  const ascending = [...DENOMS].reverse(); // copper (base) up to diamond
  return ascending.map((d, i) => ({
    name: d.name,
    short: d.short,
    value: d.value,
    below: i > 0 ? ascending[i - 1].name : null,
    reached: amt >= d.value,
    have: Math.floor(amt / d.value),
  }));
}
