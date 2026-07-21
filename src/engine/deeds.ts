// One-shot "deeds" of the beggar phase — eat, drink, wash, seek warmth, see a
// doctor, wander the village. Unlike looping activities, a deed happens once and
// costs a chunk of time (the engine advances that many ticks, so needs decay
// while you walk to the river). Wandering rolls the opportunity table.

import type { GameState, RunState } from './types';
import { nextFloat, nextInt, chance } from './rng';
import { pushLog, trainAttr } from './helpers';
import { damage, heal, maxHp, climateNow } from './survival';
import { ITEMS, itemDef, addItem, removeItem, countItem } from './items';
import { has, randomUnlearned } from './learnings';
import { gainSkill, cookRoll } from './skills';
import { TICKS_PER_DAY } from './timeconst';

/** Shared cooking: roll against Cooking skill. A success yields the good dish
 *  and +1 Cooking; a burn yields the ruined dish and no skill; a failure cooks
 *  nothing and spares the ingredients (see cookRoll for the odds). */
function doCook(run: RunState, ingredients: string[], cookedId: string, burntId: string): void {
  const res = cookRoll(run, 'cooking');
  if (res === 'failed') {
    // couldn't manage it — the ingredients are spared for another attempt.
    pushLog(run, 'You cannot get the cooking right at all — at least the ingredients are spared for another try.', 'plain');
    return;
  }
  for (const ing of ingredients) removeItem(run, ing, 1);
  const out = res === 'cooked' ? cookedId : burntId;
  // even a burnt dish teaches something; a successful cook teaches double
  gainSkill(run, 'cooking', res === 'cooked' ? 2 : 1);
  const def = ITEMS[out];
  if (addItem(run, out, 1)) {
    pushLog(
      run,
      res === 'cooked' ? `It comes out a fine ${def.name}.` : `It blackens into a ${def.name} — barely worth keeping.`,
      res === 'cooked' ? 'good' : 'bad',
    );
  } else {
    // no room to store it — eat it off the pan (or bin it if ruined)
    if (def.food) run.needs.food = clamp100(run.needs.food + def.food);
    if (def.water) run.needs.water = clamp100(run.needs.water + def.water);
    pushLog(
      run,
      def.food ? `No room to keep it, so you eat the ${def.name.toLowerCase()} straight away.` : `No room — and the ${def.name.toLowerCase()} isn't worth keeping.`,
      'plain',
    );
  }
}

export interface DeedDef {
  id: string;
  name: string;
  blurb: string;
  timeTicks: number; // in-game time the deed consumes
  cost?: number; // copper cost
  available?: (run: RunState) => boolean;
  /** only SHOW this deed when the condition holds (a locked deed is hidden, not
   *  greyed out — e.g. Cook a Fish appears only once you hold a fish). Absent = always shown. */
  reveal?: (run: RunState) => boolean;
  effect: (game: GameState, run: RunState) => void;
}

function clamp100(v: number): number {
  return Math.max(0, Math.min(100, v));
}

/** Hunted game → the roast it becomes when cooked. */
const GAME_ROAST: Record<string, string> = {
  raw_weasel: 'roast_weasel',
  raw_rabbit: 'roast_rabbit',
  raw_boar: 'roast_boar',
  raw_sheep: 'roast_sheep',
  raw_goat: 'roast_goat',
  raw_deer: 'roast_deer',
  raw_elk: 'roast_elk',
};

/** The most valuable raw beast the player is carrying (roast the best first). */
function bestRawGame(run: RunState): string | null {
  let best: string | null = null;
  let bestVal = -1;
  for (const id of Object.keys(GAME_ROAST)) {
    if (countItem(run, id) >= 1 && (ITEMS[id]?.value ?? 0) > bestVal) {
      bestVal = ITEMS[id].value;
      best = id;
    }
  }
  return best;
}

export const DEEDS: DeedDef[] = [
  {
    id: 'eat',
    name: 'Eat',
    blurb: 'Eat the most filling food from your larder.',
    timeTicks: 0,
    // only foods that actually restore the belly — a raw fish is not one (cook it first)
    available: (run) => [...run.larder, ...run.pockets].some((p) => p && (itemDef(p.item)?.food ?? 0) > 0),
    effect: (_g, run) => {
      // pick the food with the highest food value, from the larder or pockets
      let best: string | null = null;
      let bestFood = 0;
      for (const p of [...run.larder, ...run.pockets]) {
        if (!p) continue;
        const def = itemDef(p.item);
        if ((def?.food ?? 0) > bestFood) {
          bestFood = def!.food ?? 0;
          best = p.item;
        }
      }
      if (!best) {
        pushLog(run, 'You have nothing fit to eat — raw fish must be cooked first.', 'bad');
        return;
      }
      const def = ITEMS[best];
      removeItem(run, best, 1);
      run.needs.food = clamp100(run.needs.food + bestFood);
      if (def.water) run.needs.water = clamp100(run.needs.water + def.water);
      pushLog(run, `You eat a ${def.name.toLowerCase()}. The hunger eases.`, 'good');
    },
  },
  {
    id: 'drink',
    name: 'Drink',
    blurb: 'Drink from your waterskin.',
    timeTicks: 0,
    available: (run) => run.waterskinCharges > 0,
    effect: (_g, run) => {
      if (run.waterskinCharges <= 0) {
        pushLog(run, 'Your waterskin is dry.', 'bad');
        return;
      }
      run.waterskinCharges--;
      run.needs.water = clamp100(run.needs.water + 55);
      pushLog(run, 'You drink from your waterskin.', 'plain');
    },
  },
  {
    id: 'relieve',
    name: 'Relieve Yourself',
    blurb: 'Find a quiet corner. Nature calls.',
    timeTicks: 1,
    effect: (_g, run) => {
      run.needs.relief = 100;
      run.needs.hygiene = clamp100(run.needs.hygiene - 2);
      pushLog(run, 'You find a quiet corner behind the tannery.', 'plain');
    },
  },
  {
    id: 'refill_well',
    name: 'Refill at the Well',
    blurb: 'Top up your waterskin and drink your fill. Quick and unremarkable.',
    timeTicks: 2,
    effect: (_g, run) => {
      run.waterskinCharges = run.waterskinMax;
      run.needs.water = clamp100(run.needs.water + 20);
      pushLog(run, 'You draw clean water at the well and fill your skin to the brim.', 'plain');
    },
  },
  {
    id: 'bathe_well',
    name: 'Bathe at the Well',
    blurb: 'Wash the filth off — but the townsfolk despise a beggar fouling their well. Most attempts end in a chase.',
    timeTicks: 2,
    effect: (game, run) => {
      // Bathing succeeds only 30% of the time; otherwise the guard comes.
      if (chance(run, 0.3)) {
        run.needs.hygiene = 100;
        run.needs.water = clamp100(run.needs.water + 15);
        pushLog(run, 'You strip and scrub yourself clean in the well-trough before anyone raises a fuss.', 'good');
        return;
      }
      // failure → you must run (45% to get clear)
      if (chance(run, 0.45)) {
        run.heat = Math.min(100, run.heat + 3);
        pushLog(run, 'A guard bellows and charges — you snatch up your rags and outrun him through the alleys.', 'bad');
        return;
      }
      // caught → one day in the stocks
      run.stocksUntil = run.tick + TICKS_PER_DAY;
      run.activity = null;
      pushLog(run, 'The guard collars you fouling the well and drags you to the stocks for a day.', 'bad');
    },
  },
  {
    id: 'wash_river',
    name: 'Walk to the River',
    blurb: 'A long walk that eats the day — but you return clean, watered, and stronger.',
    timeTicks: 14,
    effect: (_g, run) => {
      run.needs.hygiene = 100;
      run.needs.water = 100;
      run.waterskinCharges = run.waterskinMax;
      // building the body at the mind's expense (the trade-off you chose)
      trainAttr(run, 'brawn', 0.5);
      trainAttr(run, 'vitality', 0.5);
      run.attrs.wits = Math.max(1, run.attrs.wits - 0.4);
      run.attrs.charm = Math.max(1, run.attrs.charm - 0.4);
      pushLog(run, 'You make the long walk to the river, wash body and clothes, and drink deep. Hard on the feet, good for the frame.', 'good');
      // sometimes the riverbank offers herbs
      if (chance(run, 0.3) && addItem(run, 'herbs', 1)) {
        pushLog(run, 'You gather healing herbs from the bank.', 'good');
      }
    },
  },
  {
    id: 'make_campfire',
    name: 'Make a Campfire',
    blurb: 'Burn a bundle of firewood to warm yourself in just an hour — far quicker than begging a hearth.',
    timeTicks: 1,
    reveal: (run) => climateNow(run) === 'cold',
    available: (run) => countItem(run, 'firewood') >= 1,
    effect: (_g, run) => {
      if (!removeItem(run, 'firewood', 1)) {
        pushLog(run, 'You have no firewood to burn.', 'bad');
        return;
      }
      run.needs.comfort = 100;
      run.warmUntil = run.tick + TICKS_PER_DAY;
      gainSkill(run, 'firemaking', 1);
      pushLog(run, 'You strike a spark and coax a campfire to life, warming yourself to the bone. The cold will not touch you for a day.', 'good');
    },
  },
  {
    id: 'cook_fish',
    name: 'Cook a River Fish',
    blurb: 'Fry a raw river fish in a goblet of cooking oil. It may come out golden, burn, or refuse to cook at all.',
    timeTicks: 1,
    reveal: (run) => countItem(run, 'fish') >= 1,
    available: (run) => countItem(run, 'fish') >= 1 && countItem(run, 'cooking_oil') >= 1,
    effect: (_g, run) => {
      if (countItem(run, 'fish') < 1 || countItem(run, 'cooking_oil') < 1) {
        pushLog(run, 'You need a raw river fish and a goblet of cooking oil to fry it.', 'bad');
        return;
      }
      doCook(run, ['fish', 'cooking_oil'], 'cooked_fish', 'burnt_fish');
    },
  },
  {
    id: 'bake_potato',
    name: 'Bake a Potato',
    blurb: 'Bake a raw potato with a goblet of oil and a slab of butter. It may come out crisp, burn, or refuse to bake at all.',
    timeTicks: 1,
    reveal: (run) => countItem(run, 'potato') >= 1,
    available: (run) =>
      countItem(run, 'potato') >= 1 && countItem(run, 'cooking_oil') >= 1 && countItem(run, 'slab_of_butter') >= 1,
    effect: (_g, run) => {
      if (countItem(run, 'potato') < 1 || countItem(run, 'cooking_oil') < 1 || countItem(run, 'slab_of_butter') < 1) {
        pushLog(run, 'You need a potato, a goblet of oil, and a slab of butter to bake it.', 'bad');
        return;
      }
      doCook(run, ['potato', 'cooking_oil', 'slab_of_butter'], 'baked_potato', 'burnt_potato');
    },
  },
  {
    id: 'cook_game',
    name: 'Roast Game',
    blurb: 'Roast a beast you have hunted over a goblet of oil. Your Cooking skill decides how it comes out.',
    timeTicks: 1,
    reveal: (run) => bestRawGame(run) !== null,
    available: (run) => bestRawGame(run) !== null && countItem(run, 'cooking_oil') >= 1,
    effect: (_g, run) => {
      const raw = bestRawGame(run);
      if (!raw || countItem(run, 'cooking_oil') < 1) {
        pushLog(run, 'You need a hunted beast and a goblet of oil to roast it.', 'bad');
        return;
      }
      doCook(run, [raw, 'cooking_oil'], GAME_ROAST[raw], 'burnt_meat');
    },
  },
  {
    id: 'seek_warmth',
    name: 'Seek Warmth',
    blurb: 'Huddle by a smithy or a charitable hearth. Banishes the cold and keeps it off you for a full day.',
    timeTicks: 3,
    reveal: (run) => climateNow(run) === 'cold',
    effect: (_g, run) => {
      run.needs.comfort = 100; // the cold is fully banished
      run.warmUntil = run.tick + TICKS_PER_DAY; // and cannot touch you for a day
      pushLog(run, 'You linger by a smith\'s forge until the warmth soaks deep into your bones. The cold will not touch you for a day.', 'good');
    },
  },
  {
    id: 'seek_shade',
    name: 'Seek Shade',
    blurb: 'Rest out of the sun and cool down.',
    timeTicks: 3,
    reveal: (run) => climateNow(run) === 'hot',
    effect: (_g, run) => {
      run.needs.comfort = clamp100(run.needs.comfort + 45);
      pushLog(run, 'You rest in the cool shade of the church wall.', 'plain');
    },
  },
  {
    id: 'see_doctor',
    name: 'See a Doctor',
    blurb: 'A physician\'s care — dear, but it can pull you back from the plague.',
    timeTicks: 2,
    cost: 150,
    reveal: (run) => run.illness !== 'none',
    effect: (_g, run) => {
      if (run.coin < 150) {
        pushLog(run, 'The physician takes one look at your empty purse and shuts the door.', 'bad');
        return;
      }
      run.coin -= 150;
      const wasIll = run.illness;
      run.illness = 'none';
      heal(run, 2);
      pushLog(run, wasIll !== 'none' ? 'The physician bleeds you and dresses your ills. The sickness lifts.' : 'The physician tends your hurts. You feel steadier.', 'good');
    },
  },
  {
    id: 'wander',
    name: 'Wander the Village',
    blurb: 'Walk the lanes and see what the day turns up — work, charity, salvage, or trouble.',
    timeTicks: 4,
    effect: (game, run) => wander(game, run),
  },
];

export function deedById(id: string): DeedDef | undefined {
  return DEEDS.find((d) => d.id === id);
}

// ── The wandering opportunity table (Luck-weighted) ─────────────────────────

function wander(game: GameState, run: RunState): void {
  // luck and teachings tilt the roll toward fortune
  let luck = run.attrs.luck / 100;
  if (has(run, 'sharp_eye')) luck += 0.12;
  const badGuard = has(run, 'street_smart') ? 0.5 : 1;

  const roll = nextFloat(run) + luck * 0.5;

  // good outcomes first (higher roll), trouble at the low end
  if (roll > 0.82) {
    // a teaching — rare and precious
    const learn = randomUnlearned(run);
    if (learn) {
      run.learnings[learn.id] = true;
      pushLog(run, `An old hand takes a shine to you and teaches you something: ${learn.name}.`, 'good');
      return;
    }
    // already learned everything — fall through to alms
  }
  if (roll > 0.66) {
    const alms = nextInt(run, 4, 12);
    run.coin += alms;
    if (chance(run, 0.4) && addItem(run, 'bread', 1)) {
      pushLog(run, `A clergyman takes pity — ${alms} copper and a crust of bread.`, 'coin');
    } else {
      pushLog(run, `A clergyman takes pity and presses ${alms} copper into your hand.`, 'coin');
    }
    return;
  }
  if (roll > 0.5) {
    // odd job hauling for a merchant
    const pay = nextInt(run, 6, 16);
    run.coin += pay;
    run.factions.merchants = Math.min(100, run.factions.merchants + 0.5);
    trainAttr(run, 'brawn', 0.15);
    pushLog(run, `A merchant hires your back for the afternoon — ${pay} copper.`, 'coin');
    return;
  }
  if (roll > 0.34) {
    // salvage / forage find
    const finds = ['scrap', 'roots', 'firewood'];
    const id = finds[nextInt(run, 0, finds.length - 1)];
    if (addItem(run, id, 1)) pushLog(run, `You scavenge a ${ITEMS[id].name.toLowerCase()} from the gutters.`, 'good');
    else pushLog(run, `You find a ${ITEMS[id].name.toLowerCase()}, but your pockets are full.`, 'plain');
    return;
  }
  if (roll > 0.2 * badGuard) {
    pushLog(run, 'You wander the lanes and find only mud, cold looks, and misery.', 'plain');
    return;
  }

  // trouble
  const kind = nextFloat(run);
  if (kind < 0.45) {
    const lost = Math.min(run.coin, nextInt(run, 3, 10));
    run.coin -= lost;
    pushLog(run, lost > 0 ? `A cutpurse robs you of ${lost} copper in a blind alley.` : 'A cutpurse tries you, but your purse is already empty.', 'bad');
  } else if (kind < 0.8) {
    damage(game, run, nextInt(run, 1, 2), 'beaten to death in a village lane');
    if (run.alive) {
      run.heat = Math.min(100, run.heat + 3);
      pushLog(run, 'Toughs corner you and give you a beating for sport.', 'bad');
    }
  } else {
    run.needs.hygiene = clamp100(run.needs.hygiene - 20);
    pushLog(run, 'Louts pelt you with filth and refuse. You are left fouled and shaken.', 'bad');
  }
}
