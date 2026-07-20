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

export function itemDef(id: string): ItemDef | undefined {
  return ITEMS[id];
}

export function pocketCount(run: RunState): number {
  return run.pockets.reduce((s, p) => s + (p ? p.qty : 0), 0);
}

/** Add an item, stacking onto an existing pocket or claiming an empty one.
 *  Returns false (and the item is lost to the mud) if there is no room. */
export function addItem(run: RunState, id: string, qty = 1): boolean {
  const existing = run.pockets.find((p) => p && p.item === id);
  if (existing) {
    existing.qty += qty;
    return true;
  }
  const emptyIdx = run.pockets.findIndex((p) => p === null);
  if (emptyIdx < 0) return false;
  run.pockets[emptyIdx] = { item: id, qty };
  return true;
}

export function removeItem(run: RunState, id: string, qty = 1): boolean {
  const idx = run.pockets.findIndex((p) => p && p.item === id);
  if (idx < 0) return false;
  const slot = run.pockets[idx] as ItemStack;
  if (slot.qty < qty) return false;
  slot.qty -= qty;
  if (slot.qty <= 0) run.pockets[idx] = null;
  return true;
}

export function hasRoom(run: RunState, id: string): boolean {
  if (run.pockets.some((p) => p && p.item === id)) return true;
  return run.pockets.some((p) => p === null);
}
