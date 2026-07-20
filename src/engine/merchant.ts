// The wandering merchant. Now and then a pedlar of packs and beasts of burden
// rolls into town, and while he's here you can spend coin and standing to expand
// what you can carry — a third pocket, a belt of pouches, a satchel, a backpack,
// a pack horse, a handcart, and on up to a great wagon.

import type { RunState } from './types';
import type { FactionId } from './factions';
import {
  CONTAINERS,
  MAX_POCKETS,
  MAX_POUCHES,
  MAX_CONTAINER,
  inventoryCapacity,
  syncCapacity,
} from './items';
import { pushLog } from './helpers';

export type CarryKind = 'pocket' | 'pouch' | 'container';

export interface CarryOffer {
  kind: CarryKind;
  name: string;
  desc: string;
  /** slots gained */
  slots: number;
  cost: number;
  faction: FactionId;
  factionReq: number;
  /** already maxed out — nothing more of this kind to buy */
  maxed: boolean;
}

const ORDINAL = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'];

function pocketOffer(run: RunState): CarryOffer {
  const next = (run.pocketSlots ?? 2) + 1; // the slot number we'd be buying
  return {
    kind: 'pocket',
    name: `A ${ORDINAL[next]} pocket`,
    desc: 'Another stitched pocket in your rags — one more slot to carry.',
    slots: 1,
    cost: [0, 0, 0, 40, 80, 140, 220][next] ?? 220,
    faction: 'commons',
    factionReq: [0, 0, 0, 4, 8, 12, 16][next] ?? 16,
    maxed: (run.pocketSlots ?? 2) >= MAX_POCKETS,
  };
}

function pouchOffer(run: RunState): CarryOffer {
  const owned = run.pouches ?? 0;
  return {
    kind: 'pouch',
    name: 'A belt pouch (+2)',
    desc: `A leather pouch for your belt — two more slots. Your belt holds up to ${MAX_POUCHES}.`,
    slots: 2,
    cost: 60 + owned * 30,
    faction: 'merchants',
    factionReq: 6 + owned * 4,
    maxed: owned >= MAX_POUCHES,
  };
}

const CONTAINER_COST = [0, 120, 250, 500, 1200, 2500, 6000, 15000];
const CONTAINER_FACTION = [0, 10, 20, 30, 45, 55, 70, 85];

function containerOffer(run: RunState): CarryOffer {
  const next = (run.container ?? 0) + 1;
  const tier = CONTAINERS[Math.min(next, MAX_CONTAINER)];
  return {
    kind: 'container',
    name: tier.name,
    desc: `A ${tier.name.toLowerCase()} — ${tier.add} more slots to haul your hoard.`,
    slots: tier.add,
    cost: CONTAINER_COST[Math.min(next, MAX_CONTAINER)],
    faction: 'merchants',
    factionReq: CONTAINER_FACTION[Math.min(next, MAX_CONTAINER)],
    maxed: (run.container ?? 0) >= MAX_CONTAINER,
  };
}

/** The three upgrade lines the merchant offers right now. */
export function carryOffers(run: RunState): CarryOffer[] {
  return [pocketOffer(run), pouchOffer(run), containerOffer(run)];
}

/** Can the player afford and qualify for an offer? */
export function canBuyCarry(run: RunState, offer: CarryOffer): boolean {
  return !offer.maxed && run.coin >= offer.cost && run.factions[offer.faction] >= offer.factionReq;
}

/** Buy a carry upgrade. Returns true on success. */
export function buyCarryUpgrade(run: RunState, kind: CarryKind): boolean {
  const offer = carryOffers(run).find((o) => o.kind === kind);
  if (!offer || !canBuyCarry(run, offer)) return false;
  run.coin -= offer.cost;
  if (kind === 'pocket') run.pocketSlots = (run.pocketSlots ?? 2) + 1;
  else if (kind === 'pouch') run.pouches = (run.pouches ?? 0) + 1;
  else run.container = (run.container ?? 0) + 1;
  syncCapacity(run);
  pushLog(run, `The wandering merchant hands over ${offer.name} — you can now carry ${inventoryCapacity(run)} slots.`, 'good');
  return true;
}
