// Inventory. A beggar has two pockets (2 stackable slots), a coin purse, and a
// waterskin. Gathering fills the pockets; eating and selling empty them.

import type { ItemStack, RunState } from './types';

export interface ItemDef {
  id: string;
  name: string;
  kind: 'food' | 'goods' | 'herb';
  /** food need restored when eaten */
  food?: number;
  /** water need restored when eaten */
  water?: number;
  /** hearts (in quarters) restored when eaten */
  heal?: number;
  /** sale price in copper */
  value: number;
  /** if sold by the town vendor, the price to buy one */
  buy?: number;
  blurb: string;
}

export const ITEMS: Record<string, ItemDef> = {
  bread: { id: 'bread', name: 'Crust of Bread', kind: 'food', food: 40, value: 6, blurb: 'Hard, but it fills the belly.' },
  roots: { id: 'roots', name: 'Wild Roots', kind: 'food', food: 22, water: 8, value: 2, blurb: 'Dug from the hedgerow. Bitter, but juicy.' },
  // Raw river fish is no longer fit to eat — it must be cooked with oil first.
  fish: { id: 'fish', name: 'River Fish', kind: 'food', value: 3, blurb: 'Raw and slippery. Cook it with oil before it is fit to eat.' },
  cooked_fish: { id: 'cooked_fish', name: 'Cooked River Fish', kind: 'food', food: 35, water: 5, value: 7, blurb: 'Fried golden in oil. A proper meal.' },
  burnt_fish: { id: 'burnt_fish', name: 'Burnt River Fish', kind: 'food', food: 10, value: 1, blurb: 'Charred to a cinder. Barely food at all.' },
  game: { id: 'game', name: 'Snared Game', kind: 'food', food: 46, value: 14, blurb: 'A rabbit or hare, cleanly taken.' },
  herbs: { id: 'herbs', name: 'Healing Herbs', kind: 'herb', food: 20, water: 5, heal: 0.5, value: 10, blurb: 'Feverfew and comfrey — eat them to fill the belly a little, wet the throat, and soothe wounds.' },
  firewood: { id: 'firewood', name: 'Bundle of Firewood', kind: 'goods', value: 5, blurb: 'Deadfall gathered from the wood.' },
  scrap: { id: 'scrap', name: 'Salvaged Scrap', kind: 'goods', value: 7, blurb: 'Bent nails, rags, a cracked buckle — worth a copper to someone.' },
  cooking_oil: { id: 'cooking_oil', name: 'Goblet of Cooking Oil', kind: 'goods', value: 6, buy: 12, blurb: 'Pressed oil for the pan. Needed to fry a fish or bake a potato.' },
  slab_of_butter: { id: 'slab_of_butter', name: 'Slab of Butter', kind: 'goods', value: 3, buy: 6, blurb: 'Churned fresh. Needed to bake a potato.' },
  // hard-labour spoils
  wooden_log: { id: 'wooden_log', name: 'Wooden Log', kind: 'goods', value: 3, blurb: 'Felled and split. Good timber.' },
  coal: { id: 'coal', name: 'Coal', kind: 'goods', value: 3, blurb: 'Black rock that burns hot. Hewn from the seam.' },
  iron_ore: { id: 'iron_ore', name: 'Iron Ore', kind: 'goods', value: 1, blurb: 'Raw ore, streaked with rust. Worth a copper.' },
  wheat_seeds: { id: 'wheat_seeds', name: 'Wheat Seeds', kind: 'goods', value: 2, blurb: 'A handful of seed-corn from the tilled field.' },
  // potatoes: raw is an ingredient; bake it for a meal
  potato: { id: 'potato', name: 'Potato', kind: 'food', value: 1, blurb: 'Earthy and raw. Bake it with oil and butter to make it food.' },
  baked_potato: { id: 'baked_potato', name: 'Baked Potato', kind: 'food', food: 15, value: 8, blurb: 'Crisp-skinned and steaming, dressed in butter.' },
  burnt_potato: { id: 'burnt_potato', name: 'Burnt Potato', kind: 'goods', value: 0, blurb: 'A blackened lump of charcoal. Worthless.' },
  // market-stall wares (drop while working a stall)
  pastry: { id: 'pastry', name: 'Pastry', kind: 'food', food: 25, water: 20, value: 5, blurb: 'A flaky little pastry from the stall.' },
  cake: { id: 'cake', name: 'Honey Cake', kind: 'food', food: 35, water: 25, value: 9, blurb: 'Rich, sweet, and moist with honey.' },
  fried_fish: { id: 'fried_fish', name: 'Fried Fish', kind: 'food', food: 40, water: 35, value: 11, blurb: 'Hot from the fryer, crisp and dripping.' },
  chicken_curry: { id: 'chicken_curry', name: 'Chicken Curry', kind: 'food', food: 55, water: 20, value: 15, blurb: 'A spiced eastern dish — a feast for a beggar.' },
  health_potion: { id: 'health_potion', name: 'Health Potion', kind: 'food', heal: 4, value: 20, blurb: 'A ruby draught that knits flesh — restores a whole heart.' },
};

/** Items the town vendor stocks for sale (during shop hours). */
export const VENDOR_STOCK = ['cooking_oil', 'slab_of_butter'];

/** Can this item be eaten for food/water/health? */
export function isEdible(def: ItemDef): boolean {
  return !!(def.food || def.water || def.heal);
}

/** A pocket slot holds a stack of at most this many of one item. */
export const MAX_STACK = 5;

export function itemDef(id: string): ItemDef | undefined {
  return ITEMS[id];
}

export function pocketCount(run: RunState): number {
  return run.pockets.reduce((s, p) => s + (p ? p.qty : 0), 0);
}

/** How many of an item the player is carrying, across all pocket slots. */
export function countItem(run: RunState, id: string): number {
  return run.pockets.reduce((s, p) => s + (p && p.item === id ? p.qty : 0), 0);
}

/** Add items, filling existing stacks (to MAX_STACK) then empty slots. Returns
 *  true only if ALL fit; overflow beyond two 5-stacks is lost to the mud. */
export function addItem(run: RunState, id: string, qty = 1): boolean {
  let left = qty;
  for (const slot of run.pockets) {
    if (left <= 0) break;
    if (slot && slot.item === id && slot.qty < MAX_STACK) {
      const room = MAX_STACK - slot.qty;
      const add = Math.min(room, left);
      slot.qty += add;
      left -= add;
    }
  }
  for (let i = 0; i < run.pockets.length && left > 0; i++) {
    if (run.pockets[i] === null) {
      const add = Math.min(MAX_STACK, left);
      run.pockets[i] = { item: id, qty: add };
      left -= add;
    }
  }
  return left <= 0;
}

/** Remove `qty` of an item, drawing across slots. Fails (removing nothing) if
 *  the player isn't carrying enough. */
export function removeItem(run: RunState, id: string, qty = 1): boolean {
  if (countItem(run, id) < qty) return false;
  let left = qty;
  for (let i = 0; i < run.pockets.length && left > 0; i++) {
    const slot = run.pockets[i];
    if (slot && slot.item === id) {
      const take = Math.min(slot.qty, left);
      slot.qty -= take;
      left -= take;
      if (slot.qty <= 0) run.pockets[i] = null;
    }
  }
  return true;
}

export function hasRoom(run: RunState, id: string): boolean {
  if (run.pockets.some((p) => p && p.item === id && p.qty < MAX_STACK)) return true;
  return run.pockets.some((p) => p === null);
}

// ── carry capacity: pockets → belt pouches → beasts and wagons ────────────────
// The player's slot count grows as they buy upgrades from a wandering merchant.
// pocketSlots (2–6) + pouches×2 (a belt holds up to six) + a container tier.

export interface ContainerTier {
  id: string;
  name: string;
  /** slots this tier adds on top of the previous one */
  add: number;
}

/** The container ladder, cheapest first (index 0 = none). Each tier owned adds
 *  its `add` slots; a player owns every tier up to their `container` index. */
export const CONTAINERS: ContainerTier[] = [
  { id: 'none', name: '—', add: 0 },
  { id: 'satchel', name: 'Leather Satchel', add: 3 },
  { id: 'backpack', name: 'Canvas Backpack', add: 4 },
  { id: 'travelpack', name: "Traveller's Pack", add: 5 },
  { id: 'horse', name: 'Pack Horse & Saddlebags', add: 8 },
  { id: 'handcart', name: 'Handcart', add: 10 },
  { id: 'caravan', name: "Merchant's Caravan", add: 16 },
  { id: 'wagon', name: 'Great Wagon', add: 24 },
];

export const MAX_POCKETS = 6;
export const MAX_POUCHES = 6;
export const MAX_CONTAINER = CONTAINERS.length - 1;

/** Total carry slots from pockets, belt pouches, and the owned container tier. */
export function inventoryCapacity(run: RunState): number {
  let cap = (run.pocketSlots ?? 2) + (run.pouches ?? 0) * 2;
  for (let i = 1; i <= (run.container ?? 0); i++) cap += CONTAINERS[i].add;
  return cap;
}

/** Grow the pockets array to match capacity (upgrades only ever add slots). */
export function syncCapacity(run: RunState): void {
  const cap = inventoryCapacity(run);
  while (run.pockets.length < cap) run.pockets.push(null);
}
