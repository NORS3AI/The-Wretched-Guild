// One-shot "deeds" of the beggar phase — eat, drink, wash, seek warmth, see a
// doctor. Unlike looping activities, a deed happens once and costs a chunk of
// time (the engine advances that many ticks, so needs decay while you walk to
// the river).

import type { GameState, RunState } from './types';
import { nextFloat, chance } from './rng';
import { pushLog, trainAttr } from './helpers';
import { heal, climateNow } from './survival';
import { ITEMS, itemDef, addItem, removeItem, countItem, guardShielded } from './items';
import { gainSkill, cookRoll, type CookResult } from './skills';
import { TICKS_PER_DAY } from './timeconst';

/** Shared cooking: roll against Cooking skill. A success yields the good dish
 *  and +1 Cooking; a burn yields the ruined dish and no skill; a failure cooks
 *  nothing and spares the ingredients (see cookRoll for the odds). */
/** Oil for the pan, from a physical Goblet — or, while the dev Chalice of Infinite
 *  Oil buff runs, from thin air. */
export function hasCookingOil(run: RunState): boolean {
  return (run.oilBuffMs ?? 0) > 0 || countItem(run, 'cooking_oil') >= 1;
}

function doCook(run: RunState, ingredients: string[], cookedId: string, burntId: string): CookResult {
  const res = cookRoll(run, 'cooking');
  if (res === 'failed') {
    // couldn't manage it — the ingredients are spared for another attempt.
    pushLog(run, 'You cannot get the cooking right at all — at least the ingredients are spared for another try.', 'plain');
    return res;
  }
  // the Chalice buff provides the oil, so no physical Goblet is spent while it lasts
  const oilBuffed = (run.oilBuffMs ?? 0) > 0;
  for (const ing of ingredients) {
    if (ing === 'cooking_oil' && oilBuffed) continue;
    removeItem(run, ing, 1);
  }
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
  return res;
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
export const GAME_ROAST: Record<string, string> = {
  raw_weasel: 'roast_weasel',
  raw_rabbit: 'roast_rabbit',
  raw_boar: 'roast_boar',
  raw_sheep: 'roast_sheep',
  raw_goat: 'roast_goat',
  raw_deer: 'roast_deer',
  raw_elk: 'roast_elk',
};

/** The most valuable raw beast the player is carrying (roast the best first). */
export function bestRawGame(run: RunState): string | null {
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
  // Eating no longer lives here — you eat by tapping a food in your larder or
  // pockets directly (see SurvivalPanel). Drinking stays a deed, from the skin.
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
    blurb: 'Top up your waterskin and drink your fill. Quick and unremarkable. Any empty bucket you carry is filled here too.',
    timeTicks: 2,
    effect: (_g, run) => {
      run.waterskinCharges = run.waterskinMax;
      run.needs.water = clamp100(run.needs.water + 20);
      pushLog(run, 'You draw clean water at the well and fill your skin to the brim.', 'plain');
      // any empty bucket you carry is filled at the well, automatically
      const buckets = countItem(run, 'bucket');
      if (buckets > 0 && removeItem(run, 'bucket', buckets)) {
        addItem(run, 'bucket_water', buckets);
        pushLog(run, buckets === 1 ? 'You draw your bucket brimful of well-water too.' : `You draw your ${buckets} buckets brimful of well-water too.`, 'good');
      }
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
      // caught → one day in the stocks (unless the Weatherman turns the guard)
      if (guardShielded(run)) {
        pushLog(run, 'The guard collars you fouling the well — but your great shield throws him off, and you bolt.', 'good');
        return;
      }
      run.stocksUntil = run.tick + TICKS_PER_DAY;
      run.activity = null;
      pushLog(run, 'The guard collars you fouling the well and drags you to the stocks for a day.', 'bad');
    },
  },
  {
    id: 'wash_river',
    name: 'Wash-up at the River',
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
      // any empty bucket you carry is filled at the river's edge on the way past
      const buckets = countItem(run, 'bucket');
      if (buckets > 0 && removeItem(run, 'bucket', buckets)) {
        addItem(run, 'bucket_water', buckets);
        pushLog(run, buckets === 1 ? 'You fill your bucket at the river.' : `You fill your ${buckets} buckets at the river.`, 'good');
      }
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
    // only offered when it's cold AND you actually hold firewood to burn
    reveal: (run) => climateNow(run) === 'cold' && countItem(run, 'firewood') >= 1,
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
    // one deed for all cooking of flesh: a hunted beast or a river fish, both
    // over a goblet of oil. Game is cooked first; a roasted beast also yields a
    // skin or a ruined hide.
    id: 'cook_game',
    name: 'Roast Meat',
    blurb: 'Cook a hunted beast or a river fish over a goblet of cooking oil. Your Cooking skill decides how it comes out; a roasted beast also yields a skin or a ruined hide.',
    timeTicks: 1,
    reveal: (run) => bestRawGame(run) !== null || countItem(run, 'fish') >= 1,
    available: (run) => (bestRawGame(run) !== null || countItem(run, 'fish') >= 1) && hasCookingOil(run),
    effect: (_g, run) => {
      if (!hasCookingOil(run)) {
        pushLog(run, 'You need a goblet of cooking oil to cook.', 'bad');
        return;
      }
      // roast the best hunted beast first — then fall back to a river fish
      const raw = bestRawGame(run);
      if (raw) {
        const res = doCook(run, [raw, 'cooking_oil'], GAME_ROAST[raw], 'burnt_meat');
        // the beast is skinned in the roasting: a clean skin for the tanner (30%),
        // or a hide ruined by the fire (60%) — only when it was truly cooked.
        if (res !== 'failed') {
          const r = nextFloat(run);
          if (r < 0.3) {
            addItem(run, 'animal_skin', 1);
            pushLog(run, 'You skin the beast cleanly — a good hide for the tanner.', 'good');
          } else if (r < 0.9) {
            addItem(run, 'ruined_hide', 1);
            pushLog(run, 'The hide is scorched in the roasting — ruined, but a pedlar will give a copper or two.', 'plain');
          }
        }
        return;
      }
      if (countItem(run, 'fish') >= 1) {
        doCook(run, ['fish', 'cooking_oil'], 'cooked_fish', 'burnt_fish');
        return;
      }
      pushLog(run, 'You have nothing to cook — a hunted beast or a river fish.', 'bad');
    },
  },
  {
    id: 'bake_potato',
    name: 'Bake a Potato',
    blurb: 'Bake a raw potato with a goblet of oil and a slab of butter. It may come out crisp, burn, or refuse to bake at all.',
    timeTicks: 1,
    reveal: (run) => countItem(run, 'potato') >= 1,
    available: (run) =>
      countItem(run, 'potato') >= 1 && hasCookingOil(run) && countItem(run, 'slab_of_butter') >= 1,
    effect: (_g, run) => {
      if (countItem(run, 'potato') < 1 || !hasCookingOil(run) || countItem(run, 'slab_of_butter') < 1) {
        pushLog(run, 'You need a potato, a goblet of oil, and a slab of butter to bake it.', 'bad');
        return;
      }
      doCook(run, ['potato', 'cooking_oil', 'slab_of_butter'], 'baked_potato', 'burnt_potato');
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
];

export function deedById(id: string): DeedDef | undefined {
  return DEEDS.find((d) => d.id === id);
}
