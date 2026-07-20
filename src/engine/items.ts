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
  blurb: string;
}

export const ITEMS: Record<string, ItemDef> = {
  bread: { id: 'bread', name: 'Crust of Bread', kind: 'food', food: 40, value: 6, blurb: 'Hard, but it fills the belly.' },
  roots: { id: 'roots', name: 'Wild Roots', kind: 'food', food: 22, water: 8, value: 2, blurb: 'Dug from the hedgerow. Bitter, but juicy.' },
  fish: { id: 'fish', name: 'River Fish', kind: 'food', food: 34, water: 6, value: 8, blurb: 'Fresh-caught and slippery.' },
  game: { id: 'game', name: 'Snared Game', kind: 'food', food: 46, value: 14, blurb: 'A rabbit or hare, cleanly taken.' },
  herbs: { id: 'herbs', name: 'Healing Herbs', kind: 'herb', heal: 1, water: 15, value: 10, blurb: 'Feverfew and comfrey — eat them to soothe wounds and wet the throat.' },
  firewood: { id: 'firewood', name: 'Bundle of Firewood', kind: 'goods', value: 5, blurb: 'Deadfall gathered from the wood.' },
  scrap: { id: 'scrap', name: 'Salvaged Scrap', kind: 'goods', value: 7, blurb: 'Bent nails, rags, a cracked buckle — worth a copper to someone.' },
};

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
