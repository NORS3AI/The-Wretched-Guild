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

/** Has the player bought EVERYTHING the wandering merchant will ever sell — every
 *  carry upgrade maxed and every piece of gear owned? Once so, there's no reason
 *  to send the pedlar into town again. */
export function merchantSoldOut(run: RunState): boolean {
  return carryOffers(run).every((o) => o.maxed) && gearOffers(run).every((o) => o.maxed);
}

// ── gear: waterskins, warm clothes, and a hunting bow ─────────────────────────

export type GearKind = 'waterskin' | 'warm_clothes' | 'hat' | 'bow';

export interface GearOffer {
  kind: GearKind;
  name: string;
  desc: string;
  cost: number;
  faction: FactionId;
  factionReq: number;
  /** already bought / at its ceiling */
  maxed: boolean;
}

const MAX_WATERSKIN = 12;

export function gearOffers(run: RunState): GearOffer[] {
  const skin = run.waterskinMax ?? 4;
  return [
    {
      kind: 'waterskin',
      name: 'A Larger Waterskin',
      desc: `Carry more water — ${skin} → ${skin + 2} charges.`,
      cost: 20 + (skin - 4) * 15,
      faction: 'commons',
      factionReq: 0,
      maxed: skin >= MAX_WATERSKIN,
    },
    {
      kind: 'warm_clothes',
      name: 'Warm Woollens',
      desc: 'Thick wool that keeps the cold out and your comfort in.',
      cost: 80,
      faction: 'commons',
      factionReq: 0,
      maxed: !!run.warmClothes,
    },
    {
      kind: 'hat',
      name: 'An All-Weather Hat',
      desc: 'A broad felt hat and hood — shades off the summer sun and turns the winter cold alike. Weather troubles you no more.',
      cost: 1000,
      faction: 'commons',
      factionReq: 0,
      maxed: !!run.weatherproof,
    },
    {
      kind: 'bow',
      name: 'A Hunting Bow',
      desc: 'Take up the Hunter\'s trade — stalk game in the wood.',
      cost: 150,
      faction: 'commons',
      factionReq: 0,
      maxed: !!run.hasBow,
    },
  ];
}

export function canBuyGear(run: RunState, offer: GearOffer): boolean {
  return !offer.maxed && run.coin >= offer.cost && run.factions[offer.faction] >= offer.factionReq;
}

export function buyGear(run: RunState, kind: GearKind): boolean {
  const offer = gearOffers(run).find((o) => o.kind === kind);
  if (!offer || !canBuyGear(run, offer)) return false;
  run.coin -= offer.cost;
  if (kind === 'waterskin') {
    run.waterskinMax += 2;
    run.waterskinCharges = run.waterskinMax; // a new skin comes full
    pushLog(run, `The merchant fits you a larger waterskin — ${run.waterskinMax} charges now.`, 'good');
  } else if (kind === 'warm_clothes') {
    run.warmClothes = true;
    pushLog(run, 'You pull on thick warm woollens. The cold will trouble you far less.', 'good');
  } else if (kind === 'hat') {
    run.weatherproof = true;
    pushLog(run, 'You don a broad all-weather hat and hood. Neither cold nor heat will trouble you again.', 'good');
  } else {
    run.hasBow = true;
    pushLog(run, 'You buy a hunting bow and a quiver of arrows. The Hunter\'s trade is open to you.', 'good');
  }
  return true;
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
