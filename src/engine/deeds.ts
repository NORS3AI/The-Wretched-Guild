// One-shot "deeds" of the beggar phase — eat, drink, wash, seek warmth, see a
// doctor, wander the village. Unlike looping activities, a deed happens once and
// costs a chunk of time (the engine advances that many ticks, so needs decay
// while you walk to the river). Wandering rolls the opportunity table.

import type { GameState, RunState } from './types';
import { nextFloat, nextInt, chance } from './rng';
import { pushLog, trainAttr } from './helpers';
import { damage, heal, maxHp } from './survival';
import { ITEMS, itemDef, addItem, removeItem } from './items';
import { has, randomUnlearned } from './learnings';

export interface DeedDef {
  id: string;
  name: string;
  blurb: string;
  timeTicks: number; // in-game time the deed consumes
  cost?: number; // copper cost
  available?: (run: RunState) => boolean;
  effect: (game: GameState, run: RunState) => void;
}

function clamp100(v: number): number {
  return Math.max(0, Math.min(100, v));
}

export const DEEDS: DeedDef[] = [
  {
    id: 'eat',
    name: 'Eat',
    blurb: 'Eat the most filling food in your pockets.',
    timeTicks: 0,
    available: (run) => run.pockets.some((p) => p && itemDef(p.item)?.kind === 'food'),
    effect: (_g, run) => {
      // pick the food with the highest food value
      let best: string | null = null;
      let bestFood = -1;
      for (const p of run.pockets) {
        if (!p) continue;
        const def = itemDef(p.item);
        if (def?.kind === 'food' && (def.food ?? 0) > bestFood) {
          bestFood = def.food ?? 0;
          best = p.item;
        }
      }
      if (!best) {
        pushLog(run, 'You have nothing to eat.', 'bad');
        return;
      }
      removeItem(run, best, 1);
      run.needs.food = clamp100(run.needs.food + bestFood);
      pushLog(run, `You eat a ${ITEMS[best].name.toLowerCase()}. The hunger eases.`, 'good');
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
    id: 'wash_well',
    name: 'Wash at the Well',
    blurb: 'Quick, but the townsfolk chase beggars off — and it draws notice.',
    timeTicks: 2,
    effect: (_g, run) => {
      const caught = Math.max(0.05, 0.4 - run.attrs.stealth / 80 - run.attrs.luck / 120);
      if (chance(run, caught)) {
        run.heat = Math.min(100, run.heat + 6);
        pushLog(run, 'A goodwife shrieks and drives you from the well before you can wash.', 'bad');
        return;
      }
      run.needs.hygiene = clamp100(run.needs.hygiene + 45);
      run.needs.water = clamp100(run.needs.water + 20);
      run.waterskinCharges = run.waterskinMax;
      pushLog(run, 'You scrub quickly at the well and fill your skin before anyone minds.', 'good');
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
    id: 'seek_warmth',
    name: 'Seek Warmth',
    blurb: 'Huddle by a smithy or a charitable hearth.',
    timeTicks: 3,
    effect: (_g, run) => {
      run.needs.comfort = clamp100(run.needs.comfort + 45);
      pushLog(run, 'You linger near a smith\'s forge until the shivering stops.', 'plain');
    },
  },
  {
    id: 'seek_shade',
    name: 'Seek Shade',
    blurb: 'Rest out of the sun and cool down.',
    timeTicks: 3,
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
