// Factions (§9). Your "class" is which factions you climb. Each carries a
// standing value; activities and encounters feed them, and rank promotion (§13)
// reads whichever standing you have built highest.

import type { Alignment } from './types';
import { canHoldLawfulOffice, canJoinShadow } from './alignment';

export type FactionId = 'commons' | 'shadow' | 'church' | 'merchants' | 'crown';

export interface FactionDef {
  id: FactionId;
  name: string;
  blurb: string;
  /** may this alignment build standing with this faction at all? (path gate) */
  admits: (a: Alignment) => boolean;
  gateHint: string;
}

export const FACTIONS: FactionDef[] = [
  {
    id: 'commons',
    name: 'The Commons',
    blurb: 'Field, net, and forest. Humble, lawful, and open to anyone.',
    admits: () => true,
    gateHint: '',
  },
  {
    id: 'shadow',
    name: 'The Shadow Guild',
    blurb: 'Contracts, theft, and the wretched trade. The blade refuses the saint.',
    admits: (a) => canJoinShadow(a),
    gateHint: 'The Shadow Guild will not deal with the Lawful Good.',
  },
  {
    id: 'church',
    name: 'The Church',
    blurb: 'Sanctuary and absolution — an institution of Law that gates on order, not virtue.',
    admits: (a) => canHoldLawfulOffice(a),
    gateHint: 'The Church admits no Chaotic soul into its order.',
  },
  {
    id: 'merchants',
    name: 'The Merchant Guilds',
    blurb: 'Coin as power. Grey morals welcome; all comers tolerated.',
    admits: () => true,
    gateHint: '',
  },
  {
    id: 'crown',
    name: 'The Crown',
    blurb: 'Titles, land, and legitimacy. Order is everything; Chaos may seize but not hold.',
    admits: (a) => canHoldLawfulOffice(a),
    gateHint: 'The Crown raises no Chaotic upstart to office.',
  },
];

export const FACTION_IDS: FactionId[] = FACTIONS.map((f) => f.id);

export function factionById(id: FactionId): FactionDef {
  return FACTIONS.find((f) => f.id === id)!;
}

export function emptyStanding(): Record<FactionId, number> {
  return { commons: 0, shadow: 0, church: 0, merchants: 0, crown: 0 };
}

/** The faction you've invested in most — drives your rank title (§13). Returns
 *  null while you're still nobody to everyone. */
export function dominantFaction(standing: Record<FactionId, number>): FactionId | null {
  let best: FactionId | null = null;
  let bestVal = 3; // below this you're just "destitute", no faction identity yet
  for (const id of FACTION_IDS) {
    if (standing[id] > bestVal) {
      bestVal = standing[id];
      best = id;
    }
  }
  return best;
}

/** Highest single standing — the value rank gates read. */
export function peakStanding(standing: Record<FactionId, number>): number {
  let peak = 0;
  for (const id of FACTION_IDS) peak = Math.max(peak, standing[id]);
  return peak;
}

/** Second-highest standing — higher ranks demand breadth, not just one patron. */
export function secondPeakStanding(standing: Record<FactionId, number>): number {
  const vals = FACTION_IDS.map((id) => standing[id]).sort((a, b) => b - a);
  return vals[1] ?? 0;
}

/** Total standing across every faction — what rank advancement now reads. */
export function combinedStanding(standing: Record<FactionId, number>): number {
  let sum = 0;
  for (const id of FACTION_IDS) sum += standing[id];
  return sum;
}

/** Spend `amount` of combined standing, drawn proportionally from every faction
 *  (calling in favours to rise). */
export function spendCombinedStanding(standing: Record<FactionId, number>, amount: number): void {
  const total = combinedStanding(standing);
  if (total <= 0 || amount <= 0) return;
  const factor = Math.min(1, amount / total);
  for (const id of FACTION_IDS) standing[id] = Math.max(0, standing[id] * (1 - factor));
}
