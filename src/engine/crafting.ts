// The Crafting layer — a bench of specialised skills opened once the player first
// holds coal and iron ore. Four benches (Lumberyard, Smithing, Farming,
// Leatherworking) each unlock in turn as the one before it is honed to 20%.
// A craft is run through the same idle "activity" slot as Ply Your Trade: set it
// and time carries each cycle, consuming stock and producing a ware until either
// the materials run out or there is nowhere left to stow the result.

import type { RunState } from './types';
import type { ActivityDef } from './activities';
import { addItem, removeItem, countItem, ITEMS } from './items';
import { gainSkill, skillLevel } from './skills';
import { pushLog } from './helpers';

export type CraftSkillId = 'lumberyard' | 'smithing' | 'farming' | 'leatherworking';

export interface CraftBench {
  id: CraftSkillId;
  name: string;
  blurb: string;
}

/** The four benches, in the order they unlock. */
export const CRAFT_BENCHES: CraftBench[] = [
  { id: 'lumberyard', name: 'Lumberyard', blurb: 'Saw oak logs into boards, and join boards into furniture.' },
  { id: 'smithing', name: 'Smithing', blurb: 'Smelt ore and coal into iron, and forge it into tools and arms.' },
  { id: 'farming', name: 'Farming', blurb: 'Thresh seed into grain, and bake grain into bread and pies.' },
  { id: 'leatherworking', name: 'Leatherworking', blurb: 'Tan skins into leather, and stitch leather into fine goods.' },
];

export interface CraftRecipe {
  id: string; // activity id, e.g. 'craft_oak_board'
  skill: CraftSkillId;
  name: string;
  inputs: { item: string; qty: number }[];
  output: { item: string; qty: number };
  /** a by-product handed back each craft (e.g. the empty bucket after milling) */
  returns?: { item: string; qty: number };
  ticks: number; // craft time (2 s per tick)
  gain: number; // skill % gained per craft
  blurb: string;
}

// ── The recipe book ───────────────────────────────────────────────────────────

export const RECIPES: CraftRecipe[] = [
  // Lumberyard ────────────────────────────────────────────────────────────────
  { id: 'craft_oak_board', skill: 'lumberyard', name: 'Oak Boards', inputs: [{ item: 'wooden_log', qty: 5 }], output: { item: 'oak_board', qty: 2 }, ticks: 5, gain: 1.5, blurb: 'Saw five oak logs down into two clean boards.' },
  { id: 'craft_wooden_chair', skill: 'lumberyard', name: 'Wooden Chair', inputs: [{ item: 'oak_board', qty: 2 }], output: { item: 'wooden_chair', qty: 1 }, ticks: 6, gain: 1, blurb: 'Join two boards into a sturdy chair.' },
  { id: 'craft_wooden_table', skill: 'lumberyard', name: 'Wooden Table', inputs: [{ item: 'oak_board', qty: 4 }], output: { item: 'wooden_table', qty: 1 }, ticks: 8, gain: 1.2, blurb: 'Plane four boards into a broad table.' },
  { id: 'craft_wooden_bed', skill: 'lumberyard', name: 'Wooden Bed', inputs: [{ item: 'oak_board', qty: 6 }], output: { item: 'wooden_bed', qty: 1 }, ticks: 10, gain: 1.5, blurb: 'Frame six boards into a bedstead.' },
  { id: 'craft_wooden_bookcase', skill: 'lumberyard', name: 'Wooden Bookcase', inputs: [{ item: 'oak_board', qty: 8 }], output: { item: 'wooden_bookcase', qty: 1 }, ticks: 12, gain: 1.8, blurb: 'Shelve eight boards into a bookcase.' },
  { id: 'craft_wooden_chest', skill: 'lumberyard', name: 'Wooden Chest', inputs: [{ item: 'oak_board', qty: 10 }], output: { item: 'wooden_chest', qty: 1 }, ticks: 15, gain: 2.2, blurb: 'Band ten boards into a stout chest.' },

  // Smithing ────────────────────────────────────────────────────────────────
  { id: 'craft_iron_bar', skill: 'smithing', name: 'Iron Bar', inputs: [{ item: 'coal', qty: 2 }, { item: 'iron_ore', qty: 1 }], output: { item: 'iron_bar', qty: 1 }, ticks: 5, gain: 1.5, blurb: 'Smelt two coal and an ore into a bar of iron.' },
  { id: 'craft_nails', skill: 'smithing', name: 'Iron Nails', inputs: [{ item: 'iron_bar', qty: 1 }], output: { item: 'nails', qty: 5 }, ticks: 4, gain: 1, blurb: 'Draw a bar out into five nails.' },
  { id: 'craft_hammer', skill: 'smithing', name: 'Hammer', inputs: [{ item: 'iron_bar', qty: 2 }, { item: 'oak_board', qty: 1 }], output: { item: 'hammer', qty: 1 }, ticks: 6, gain: 1.2, blurb: 'Forge a hammer-head and haft it.' },
  { id: 'craft_hoe', skill: 'smithing', name: 'Hoe', inputs: [{ item: 'iron_bar', qty: 3 }, { item: 'oak_board', qty: 2 }], output: { item: 'hoe', qty: 1 }, ticks: 8, gain: 1.4, blurb: 'Forge a field-hand\'s hoe.' },
  { id: 'craft_spade', skill: 'smithing', name: 'Spade', inputs: [{ item: 'iron_bar', qty: 3 }, { item: 'oak_board', qty: 2 }], output: { item: 'spade', qty: 1 }, ticks: 8, gain: 1.4, blurb: 'Forge a digging spade.' },
  { id: 'craft_pickaxe', skill: 'smithing', name: 'Pickaxe', inputs: [{ item: 'iron_bar', qty: 3 }, { item: 'oak_board', qty: 2 }], output: { item: 'pickaxe', qty: 1 }, ticks: 8, gain: 1.4, blurb: 'Forge a miner\'s pick.' },
  { id: 'craft_felling_axe', skill: 'smithing', name: 'Felling Axe', inputs: [{ item: 'iron_bar', qty: 4 }, { item: 'oak_board', qty: 4 }], output: { item: 'felling_axe', qty: 1 }, ticks: 9, gain: 1.8, blurb: 'Forge a great felling axe.' },
  { id: 'craft_bucket', skill: 'smithing', name: 'Bucket', inputs: [{ item: 'iron_bar', qty: 5 }, { item: 'oak_board', qty: 5 }], output: { item: 'bucket', qty: 1 }, ticks: 10, gain: 2, blurb: 'Rivet a stout iron bucket.' },
  { id: 'craft_iron_rivets', skill: 'smithing', name: 'Iron Rivets', inputs: [{ item: 'iron_bar', qty: 6 }], output: { item: 'iron_rivets', qty: 1 }, ticks: 11, gain: 2.4, blurb: 'Cut a keg of stout rivets.' },
  { id: 'craft_iron_spike', skill: 'smithing', name: 'The Iron Spike', inputs: [{ item: 'iron_bar', qty: 8 }], output: { item: 'iron_spike', qty: 1 }, ticks: 14, gain: 3, blurb: 'Forge a cruel dagger. Carried, it sharpens your Stealth and your cutpurse\'s luck (+10%).' },
  { id: 'craft_weatherman', skill: 'smithing', name: 'The Weatherman', inputs: [{ item: 'iron_bar', qty: 10 }], output: { item: 'weatherman', qty: 1 }, ticks: 17, gain: 3.5, blurb: 'Forge a great shield. Carried, the guard\'s hand slips off you half the time they would haul you away.' },

  // Farming ────────────────────────────────────────────────────────────────
  { id: 'craft_grain_pouch', skill: 'farming', name: 'Pouch of Grain', inputs: [{ item: 'wheat_seeds', qty: 5 }], output: { item: 'grain_pouch', qty: 1 }, ticks: 6, gain: 1.5, blurb: 'Sow and thresh five wheat seeds into a pouch of grain.' },
  { id: 'craft_scone', skill: 'farming', name: 'Scone', inputs: [{ item: 'grain_pouch', qty: 1 }], output: { item: 'scone', qty: 1 }, ticks: 4, gain: 1, blurb: 'Bake a plain scone.' },
  { id: 'craft_banana_loaf', skill: 'farming', name: 'Banana Nut Loaf', inputs: [{ item: 'grain_pouch', qty: 2 }], output: { item: 'banana_loaf', qty: 1 }, ticks: 5, gain: 1.2, blurb: 'Bake a sweet, nutty loaf.' },
  { id: 'craft_shepherds_pie', skill: 'farming', name: 'Shepherds Pie', inputs: [{ item: 'grain_pouch', qty: 3 }], output: { item: 'shepherds_pie', qty: 1 }, ticks: 6, gain: 1.4, blurb: 'Bake a hearty shepherds pie.' },
  { id: 'craft_grandmaster_cake', skill: 'farming', name: "Grand Master's Cake", inputs: [{ item: 'grain_pouch', qty: 5 }], output: { item: 'grandmaster_cake', qty: 1 }, ticks: 8, gain: 1.8, blurb: 'Bake a towering master\'s cake.' },
  { id: 'craft_french_toast', skill: 'farming', name: 'French Toast', inputs: [{ item: 'grain_pouch', qty: 7 }, { item: 'slab_of_butter', qty: 1 }], output: { item: 'french_toast', qty: 1 }, ticks: 9, gain: 2.2, blurb: 'Griddle French toast in butter.' },
  { id: 'craft_leek_pie', skill: 'farming', name: "Winters' Leek Pie", inputs: [{ item: 'grain_pouch', qty: 9 }, { item: 'slab_of_butter', qty: 1 }, { item: 'cooking_oil', qty: 1 }], output: { item: 'leek_pie', qty: 1 }, ticks: 11, gain: 2.6, blurb: 'Bake a great leek pie, oiled and buttered.' },

  // Leatherworking — the bench is here, but not yet fitted out with any patterns.
];

export function recipeById(id: string): CraftRecipe | undefined {
  return RECIPES.find((r) => r.id === id);
}

export function recipesForBench(skill: CraftSkillId): CraftRecipe[] {
  return RECIPES.filter((r) => r.skill === skill);
}

// ── Gates ────────────────────────────────────────────────────────────────────

/** The Crafting tab itself opens the first time the player holds 2 coal and an
 *  ore — a moment latched permanently onto the run (see advanceTick). */
export function craftingUnlocked(run: RunState): boolean {
  return !!run.craftingUnlocked;
}

/** The skill % a bench demands of the PRECEDING bench before it opens. */
export const BENCH_UNLOCK_SKILL = 20;

/** Which bench must be honed to 20% before this one opens (null = always open). */
function benchPrereq(skill: CraftSkillId): CraftSkillId | null {
  switch (skill) {
    case 'lumberyard': return null; // always open once Crafting is unlocked
    case 'smithing': return 'lumberyard';
    case 'farming': return 'smithing';
    case 'leatherworking': return 'farming';
  }
}

/** Is this bench open? Lumberyard always; the rest once the prior bench hits 20%. */
export function benchUnlocked(run: RunState, skill: CraftSkillId): boolean {
  if (!craftingUnlocked(run)) return false;
  const prereq = benchPrereq(skill);
  if (!prereq) return true;
  return skillLevel(run, prereq) >= BENCH_UNLOCK_SKILL;
}

/** What the NEXT locked bench is waiting on, for a helpful "locked" hint. */
export function benchLockHint(skill: CraftSkillId): string | null {
  const prereq = benchPrereq(skill);
  if (!prereq) return null;
  const name = CRAFT_BENCHES.find((b) => b.id === prereq)?.name ?? prereq;
  return `Hone ${name} to ${BENCH_UNLOCK_SKILL}% to open this bench.`;
}

/** Does the player hold every ingredient this recipe needs? */
export function canCraft(run: RunState, r: CraftRecipe): boolean {
  return r.inputs.every((inp) => countItem(run, inp.item) >= inp.qty);
}

// ── The craft activity ─────────────────────────────────────────────────────────

function makeCraftActivity(r: CraftRecipe): ActivityDef {
  return {
    id: r.id,
    name: r.name,
    path: 'Crafting',
    blurb: r.blurb,
    ticks: r.ticks,
    trains: null,
    // you can only START a craft you can afford, at a bench that is open
    available: (run) => benchUnlocked(run, r.skill) && canCraft(run, r),
    complete(run) {
      // re-checked every loop: stop cleanly the moment the stock runs out
      if (!canCraft(run, r)) {
        run.craftActivity = null;
        pushLog(run, `You run out of stock at the bench — the ${r.name.toLowerCase()} goes unfinished.`, 'plain');
        return;
      }
      for (const inp of r.inputs) removeItem(run, inp.item, inp.qty);
      // addItem always absorbs the ware (a full ×20 stack auto-sells the extra)
      addItem(run, r.output.item, r.output.qty);
      if (r.returns) addItem(run, r.returns.item, r.returns.qty);
      gainSkill(run, r.skill, r.gain);
      const outName = ITEMS[r.output.item].name;
      pushLog(
        run,
        r.output.qty > 1 ? `You craft ${r.output.qty}× ${outName}.` : `You craft a ${outName.toLowerCase()}.`,
        'good',
      );
    },
  };
}

/** One activity per recipe, keyed by the recipe id (`craft_<thing>`). */
export const CRAFT_ACTIVITIES: ActivityDef[] = RECIPES.map(makeCraftActivity);

export function craftActivityById(id: string): ActivityDef | undefined {
  return CRAFT_ACTIVITIES.find((a) => a.id === id);
}
