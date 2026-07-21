// Inventory. A beggar has two pockets (2 stackable slots), a coin purse, and a
// waterskin. Gathering fills the pockets; eating and selling empty them.

import type { ItemStack, RunState } from './types';
import { pushLog } from './helpers';
import { chance } from './rng';

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
  // ── game (hunted with a bow; raw is an ingredient, roast it with oil to eat) ──
  raw_weasel: { id: 'raw_weasel', name: 'Weasel', kind: 'food', value: 11, blurb: 'A scrawny weasel. Roast it with oil to make a meagre meal.' },
  raw_rabbit: { id: 'raw_rabbit', name: 'Rabbit', kind: 'food', value: 20, blurb: 'A plump rabbit. Roast it with oil.' },
  raw_boar: { id: 'raw_boar', name: 'Wild Boar', kind: 'food', value: 45, blurb: 'A tusked boar. Roast it with oil.' },
  raw_sheep: { id: 'raw_sheep', name: 'Sheep', kind: 'food', value: 75, blurb: 'A stray sheep. Roast it with oil.' },
  raw_goat: { id: 'raw_goat', name: 'Goat', kind: 'food', value: 120, blurb: 'A wild goat. Roast it with oil.' },
  raw_deer: { id: 'raw_deer', name: 'Deer', kind: 'food', value: 190, blurb: 'A fine deer. Roast it with oil.' },
  raw_elk: { id: 'raw_elk', name: 'Elk', kind: 'food', value: 300, blurb: 'A great elk — the trophy of the wood. Roast it with oil.' },
  roast_weasel: { id: 'roast_weasel', name: 'Roast Weasel', kind: 'food', food: 5, value: 14, blurb: 'Stringy, but food.' },
  roast_rabbit: { id: 'roast_rabbit', name: 'Roast Rabbit', kind: 'food', food: 10, water: 5, value: 26, blurb: 'Tender and hot.' },
  roast_boar: { id: 'roast_boar', name: 'Roast Boar', kind: 'food', food: 15, water: 5, value: 58, blurb: 'Rich, fatty meat.' },
  roast_sheep: { id: 'roast_sheep', name: 'Roast Mutton', kind: 'food', food: 20, water: 5, value: 97, blurb: 'A proper joint of mutton.' },
  roast_goat: { id: 'roast_goat', name: 'Roast Goat', kind: 'food', food: 30, water: 5, value: 156, blurb: 'Gamey and filling.' },
  roast_deer: { id: 'roast_deer', name: 'Roast Venison', kind: 'food', food: 40, water: 10, value: 247, blurb: 'A feast of venison.' },
  roast_elk: { id: 'roast_elk', name: 'Roast Elk', kind: 'food', food: 65, water: 10, value: 390, blurb: 'A king\'s portion. Restores you mightily.' },
  burnt_meat: { id: 'burnt_meat', name: 'Burnt Meat', kind: 'food', food: 5, value: 1, blurb: 'Charred to leather. Barely worth eating.' },
  herbs: { id: 'herbs', name: 'Healing Herbs', kind: 'herb', food: 20, water: 5, heal: 0.5, value: 10, blurb: 'Feverfew and comfrey — eat them to fill the belly a little, wet the throat, and soothe wounds.' },
  firewood: { id: 'firewood', name: 'Bundle of Firewood', kind: 'goods', value: 5, blurb: 'Deadfall gathered from the wood.' },
  scrap: { id: 'scrap', name: 'Salvaged Scrap', kind: 'goods', value: 7, blurb: 'Bent nails, rags, a cracked buckle — worth a copper to someone.' },
  cooking_oil: { id: 'cooking_oil', name: 'Goblet of Cooking Oil', kind: 'goods', value: 6, buy: 12, blurb: 'Pressed oil for the pan. Needed to fry a fish or bake a potato.' },
  slab_of_butter: { id: 'slab_of_butter', name: 'Slab of Butter', kind: 'goods', value: 3, buy: 6, blurb: 'Churned fresh. Needed to bake a potato.' },
  // hard-labour spoils
  wooden_log: { id: 'wooden_log', name: 'Oak Log', kind: 'goods', value: 3, blurb: 'Felled and split. Good oak timber for the lumberyard.' },
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

  // ── Crafting reagents (worth no coin — their value is what you make of them) ──
  oak_board: { id: 'oak_board', name: 'Oak Board', kind: 'goods', value: 0, blurb: 'Sawn and planed at the lumberyard. Stock for finer joinery.' },
  iron_bar: { id: 'iron_bar', name: 'Iron Bar', kind: 'goods', value: 0, blurb: 'Smelted from ore and coal at the forge. The smith\'s raw stock.' },
  grain_pouch: { id: 'grain_pouch', name: 'Pouch of Grain', kind: 'goods', value: 0, blurb: 'Threshed grain, bagged and ready for the baker\'s board.' },
  animal_skin: { id: 'animal_skin', name: 'Animal Skin', kind: 'goods', value: 0, blurb: 'A clean hide off a roasted beast. Kept back for the leatherworker\'s bench.' },
  bucket_water: { id: 'bucket_water', name: 'Bucket of Water', kind: 'goods', value: 0, blurb: 'A brimming bucket, drawn from the well or the river.' },
  ruined_hide: { id: 'ruined_hide', name: 'Ruined Hide', kind: 'goods', value: 3, blurb: 'A hide torn ragged in the roasting — fit only to be sold for a copper or three.' },

  // ── Lumberyard wares ──
  wooden_chair: { id: 'wooden_chair', name: 'Wooden Chair', kind: 'goods', value: 10, blurb: 'A sturdy joined chair. Someone will pay for a seat.' },
  wooden_table: { id: 'wooden_table', name: 'Wooden Table', kind: 'goods', value: 14, blurb: 'A broad oak table, planed smooth.' },
  wooden_bed: { id: 'wooden_bed', name: 'Wooden Bed', kind: 'goods', value: 18, blurb: 'A framed bedstead — a rare comfort in these parts.' },
  wooden_bookcase: { id: 'wooden_bookcase', name: 'Wooden Bookcase', kind: 'goods', value: 24, blurb: 'Shelves for a gentleman\'s library.' },
  wooden_chest: { id: 'wooden_chest', name: 'Wooden Chest', kind: 'goods', value: 33, blurb: 'A banded oak chest, worth a good deal.' },

  // ── Smithing wares ──
  nails: { id: 'nails', name: 'Iron Nails', kind: 'goods', value: 3, blurb: 'A fistful of hand-forged nails.' },
  hammer: { id: 'hammer', name: 'Hammer', kind: 'goods', value: 10, blurb: 'An iron-headed hammer on an oak haft.' },
  hoe: { id: 'hoe', name: 'Hoe', kind: 'goods', value: 20, blurb: 'A field-hand\'s hoe.' },
  spade: { id: 'spade', name: 'Spade', kind: 'goods', value: 20, blurb: 'A digging spade, edge honed.' },
  pickaxe: { id: 'pickaxe', name: 'Pickaxe', kind: 'goods', value: 20, blurb: 'A miner\'s pick, ground to a point.' },
  felling_axe: { id: 'felling_axe', name: 'Felling Axe', kind: 'goods', value: 40, blurb: 'A great two-handed axe for the woodsman.' },
  bucket: { id: 'bucket', name: 'Bucket', kind: 'goods', value: 66, blurb: 'A riveted iron pail. Fill it at the well or the river.' },
  iron_rivets: { id: 'iron_rivets', name: 'Iron Rivets', kind: 'goods', value: 100, blurb: 'A keg of stout rivets — the shipwright\'s and armourer\'s need.' },
  iron_spike: { id: 'iron_spike', name: 'The Iron Spike', kind: 'goods', value: 140, blurb: 'A cruel forged dagger. While you carry it, your Stealth and your luck at cutting purses both sharpen (+10%).' },
  weatherman: { id: 'weatherman', name: 'The Weatherman', kind: 'goods', value: 200, blurb: 'A great riveted shield. While you carry it, there is a fair chance (50%) the guard\'s hand slips off you when they would drag you away.' },

  // ── Farming board (baked goods, eaten straight from the pouch) ──
  scone: { id: 'scone', name: 'Scone', kind: 'food', food: 5, value: 4, blurb: 'A plain little scone.' },
  banana_loaf: { id: 'banana_loaf', name: 'Banana Nut Loaf', kind: 'food', food: 10, value: 8, blurb: 'Sweet, dense, and nutty.' },
  shepherds_pie: { id: 'shepherds_pie', name: 'Shepherds Pie', kind: 'food', food: 20, value: 14, blurb: 'Meat and mash under a golden crust.' },
  grandmaster_cake: { id: 'grandmaster_cake', name: "Grand Master's Cake", kind: 'food', food: 30, water: 5, value: 22, blurb: 'A towering, moist cake fit for the Guild\'s master.' },
  french_toast: { id: 'french_toast', name: 'French Toast', kind: 'food', food: 40, water: 10, value: 34, blurb: 'Griddled in butter, rich and filling.' },
  leek_pie: { id: 'leek_pie', name: "Winters' Leek Pie", kind: 'food', food: 55, water: 20, value: 50, blurb: 'A great steaming leek pie, oiled and buttered — a feast against the winter.' },
};

/** Does carrying this item grant a passive effect (equipment)? */
export function hasIronSpike(run: RunState): boolean {
  return countItem(run, 'iron_spike') >= 1;
}
export function hasWeatherman(run: RunState): boolean {
  return countItem(run, 'weatherman') >= 1;
}
/** The Weatherman shield turns the guard's hand: while carried, a 50% chance to
 *  slip any seizure that would drag you to the stocks. */
export function guardShielded(run: RunState): boolean {
  return hasWeatherman(run) && chance(run, 0.5);
}

/** Items the town vendor stocks for sale (during shop hours). */
export const VENDOR_STOCK = ['cooking_oil', 'slab_of_butter'];

/** Can this item be eaten for food/water/health? */
export function isEdible(def: ItemDef): boolean {
  return !!(def.food || def.water || def.heal);
}

/** A slot holds a stack of at most this many of one item. Every item is capped
 *  at a SINGLE stack of this size — the pockets and larder never clutter with a
 *  second stack of the same thing; anything over the cap is auto-sold instead. */
export const MAX_STACK = 20;

/** The larder — a dedicated six-slot store just for food, kept apart from the
 *  pockets so a purse full of ingredients never leaves you unable to cook. */
export const LARDER_SLOTS = 6;

export function itemDef(id: string): ItemDef | undefined {
  return ITEMS[id];
}

/** Does this item belong in the food larder (rather than the pockets)? Only food
 *  you can actually EAT lives in the larder. Raw catch and raw ingredients — a
 *  hunted beast, a river fish, a potato — are not edible until cooked, so they
 *  wait in the pockets and only their cooked form goes to the larder. Herbs
 *  (edible and healing) belong in the larder too. */
export function isLarderItem(id: string): boolean {
  const def = itemDef(id);
  if (!def) return false;
  if (def.kind === 'herb') return true;
  return def.kind === 'food' && isEdible(def);
}

/** The slot-array an item lives in: the larder for food, the pockets otherwise. */
export function slotsFor(run: RunState, id: string): (ItemStack | null)[] {
  return isLarderItem(id) ? run.larder : run.pockets;
}

export function pocketCount(run: RunState): number {
  return run.pockets.reduce((s, p) => s + (p ? p.qty : 0), 0);
}

function countIn(arr: (ItemStack | null)[] | undefined, id: string): number {
  return (arr ?? []).reduce((s, p) => s + (p && p.item === id ? p.qty : 0), 0);
}

/** How many of an item the player carries, across both pockets and larder. */
export function countItem(run: RunState, id: string): number {
  return countIn(run.pockets, id) + countIn(run.larder, id);
}

/** Add items to the item's home store (larder for food, pockets otherwise).
 *  Every item is held as ONE stack of at most MAX_STACK; the first stack found is
 *  topped up, or a single empty slot is claimed. Anything that would spill past
 *  the cap (or that finds no slot at all) is AUTO-SOLD at the item's value rather
 *  than cluttering the inventory with a second stack — so this never fails.
 *  Always returns true (the goods are always absorbed, stored or sold). */
export function addItem(run: RunState, id: string, qty = 1): boolean {
  const slots = slotsFor(run, id);
  let left = qty;
  // top up the single existing stack of this item, if there is one
  const existing = slots.find((s) => s && s.item === id) as ItemStack | undefined;
  if (existing) {
    const add = Math.min(MAX_STACK - existing.qty, left);
    existing.qty += add;
    left -= add;
  } else {
    // no stack yet — claim one empty slot for it
    for (let i = 0; i < slots.length; i++) {
      if (slots[i] === null) {
        const add = Math.min(MAX_STACK, left);
        slots[i] = { item: id, qty: add };
        left -= add;
        break;
      }
    }
  }
  // whatever is left has nowhere to go without a second stack — sell it off
  if (left > 0) {
    const def = ITEMS[id];
    const val = def?.value ?? 0;
    if (val > 0) {
      run.coin += val * left;
      if (run.coin > run.peakCoin) run.peakCoin = run.coin;
      pushLog(run, `Your ${def.name.toLowerCase()} is capped at ${MAX_STACK}; ${left} more sell for ${val * left} copper.`, 'coin');
    }
  }
  return true;
}

function drainFrom(arr: (ItemStack | null)[] | undefined, id: string, left: number): number {
  if (!arr) return left;
  for (let i = 0; i < arr.length && left > 0; i++) {
    const slot = arr[i];
    if (slot && slot.item === id) {
      const take = Math.min(slot.qty, left);
      slot.qty -= take;
      left -= take;
      if (slot.qty <= 0) arr[i] = null;
    }
  }
  return left;
}

/** Remove `qty` of an item, drawing from its home store first and then the other
 *  (so items on older saves are still reachable). Fails if not carrying enough. */
export function removeItem(run: RunState, id: string, qty = 1): boolean {
  if (countItem(run, id) < qty) return false;
  let left = qty;
  left = drainFrom(slotsFor(run, id), id, left);
  left = drainFrom(run.pockets, id, left);
  left = drainFrom(run.larder, id, left);
  return true;
}

export function hasRoom(run: RunState, id: string): boolean {
  const slots = slotsFor(run, id);
  if (slots.some((p) => p && p.item === id && p.qty < MAX_STACK)) return true;
  return slots.some((p) => p === null);
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
