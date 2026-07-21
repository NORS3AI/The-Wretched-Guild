// The beggar-phase survival simulation (§ beggar phase): hearts, needs, weather,
// and illness. This is what makes the gutter a place you have to *survive*, not
// just wait in.

import type { GameState, Needs, RunState } from './types';
import { chance, nextFloat } from './rng';
import { pushLog } from './helpers';
import { die } from './death';
import { TICKS_PER_DAY, TICKS_PER_YEAR } from './timeconst';

export const QUARTERS_PER_HEART = 4;
export const BASE_HEARTS = 3;

/** Maximum hearts (in quarters): 3 base + meta bonus + vitality endurance. */
export function maxHp(run: RunState): number {
  const hearts = BASE_HEARTS + run.heartsBonus + Math.floor(run.attrs.vitality / 10);
  return hearts * QUARTERS_PER_HEART;
}

export function damage(game: GameState, run: RunState, quarters: number, cause: string): void {
  run.hp = Math.max(0, run.hp - quarters);
  if (run.hp <= 0 && run.alive) die(game, run, cause);
}

export function heal(run: RunState, quarters: number): void {
  run.hp = Math.min(maxHp(run), run.hp + quarters);
}

export function emptyNeeds(): Needs {
  return { food: 100, water: 100, comfort: 100, hygiene: 100, relief: 100 };
}

// ── Weather ─────────────────────────────────────────────────────────────────

export type Climate = 'cold' | 'hot' | 'mild';

/** Climate from season + time of day (nights bite; summer swelters). */
export function climateNow(run: RunState): Climate {
  const dayOfYear = Math.floor((run.tick % TICKS_PER_YEAR) / TICKS_PER_DAY);
  const season = Math.floor((dayOfYear / (TICKS_PER_YEAR / TICKS_PER_DAY)) * 4) % 4; // 0 Spring..3 Winter
  const hour = run.tick % TICKS_PER_DAY;
  const night = hour < 6 || hour >= 20;
  if (season === 3) return 'cold'; // winter
  if (season === 1) return night ? 'mild' : 'hot'; // summer days swelter
  return night ? 'cold' : 'mild'; // spring/autumn nights are cold
}

// ── Per-tick decay & consequences ──────────────────────────────────────────

// Per-tick decay (24 ticks = 1 day). Tuned for the lively 0.5s tick so needs are
// a comfortable background concern (many minutes of real time from full), not a
// frantic chore.
const DECAY = {
  food: 0.24, // ~16 days from full
  water: 0.3, // ~14 days
  hygiene: 0.06, // very slow
  relief: 0.4, // ~10 days
};

function clampNeed(v: number): number {
  return Math.max(0, Math.min(100, v));
}

/** Advance all survival needs by one tick, then apply their consequences.
 *  Returns true if the character died. */
export function tickSurvival(game: GameState, run: RunState): boolean {
  const n = run.needs;
  n.food = clampNeed(n.food - DECAY.food);
  n.water = clampNeed(n.water - DECAY.water);
  n.hygiene = clampNeed(n.hygiene - DECAY.hygiene - (n.relief <= 0 ? 0.6 : 0));
  n.relief = clampNeed(n.relief - DECAY.relief);

  // comfort drains under harsh weather; mild weather lets it recover.
  // the "hardy" teaching blunts the weather, and Seeking Warmth grants a full
  // day's immunity to the cold.
  const climate = climateNow(run);
  const hardy = run.learnings['hardy'] ? 0.6 : 1;
  // warm woollens keep the cold out just like Seeking Warmth does
  const warm = run.warmUntil > run.tick || run.warmClothes;
  if (run.weatherproof) n.comfort = clampNeed(n.comfort + 0.2); // the hat shrugs off both cold AND heat
  else if (climate === 'cold' && !warm) n.comfort = clampNeed(n.comfort - 0.28 * hardy);
  else if (climate === 'hot') n.comfort = clampNeed(n.comfort - 0.22 * hardy);
  else n.comfort = clampNeed(n.comfort + 0.2); // mild, or cold-but-warm

  // Starvation: while food is empty, lose a quarter-heart every 4 hours (ticks).
  if (n.food <= 0) {
    run.starveClock++;
    if (run.starveClock >= 4) {
      run.starveClock = 0;
      run.starveHits++; // signals the screen flash
      damage(game, run, 1, 'starved to death in the gutter');
      if (!run.alive) return true;
      pushLog(run, 'Your empty belly cramps — starvation gnaws a wound into you. Find food!', 'bad');
    }
  } else {
    run.starveClock = 0;
  }
  // Filth: while fully filthy, lose a quarter-heart every 8 hours.
  if (n.hygiene <= 0) {
    run.filthClock++;
    if (run.filthClock >= 8) {
      run.filthClock = 0;
      damage(game, run, 1, 'rotted away in your own filth');
      if (!run.alive) return true;
      pushLog(run, 'Sores fester on your filthy skin. You must wash.', 'bad');
    }
  } else {
    run.filthClock = 0;
  }
  if (n.water <= 0 && chance(run, 0.045)) {
    damage(game, run, 1, 'dead of thirst');
    if (!run.alive) return true;
    pushLog(run, 'Your throat is cracked and dry. Thirst is killing you.', 'bad');
  }
  if (n.comfort <= 0 && chance(run, 0.04)) {
    const cause = climate === 'hot' ? 'dead of heat and sun' : 'frozen to death in the cold';
    damage(game, run, 1, cause);
    if (!run.alive) return true;
    pushLog(run, climate === 'hot' ? 'The sun hammers you; you reel with heat-sickness.' : 'You shiver uncontrollably; the cold is in your bones.', 'bad');
  }

  // illness: filth and foul weather breed sickness; plague is a killer
  tickIllness(game, run, climate);
  return !run.alive;
}

function tickIllness(game: GameState, run: RunState, climate: Climate): void {
  if (run.illness === 'none') {
    // chance to fall ill scales with filth and exposure
    const filth = (100 - run.needs.hygiene) / 100;
    const cold = climate === 'cold' && run.needs.comfort < 40 ? 0.5 : 0;
    const guts = run.learnings['iron_stomach'] ? 0.5 : 1; // a hard gut resists sickness
    const p = (0.00025 + filth * 0.0009 + cold * 0.0006) * guts;
    if (chance(run, p)) {
      // most sickness is a fever; rarely, the plague
      run.illness = nextFloat(run) < 0.15 ? 'plague' : 'fever';
      pushLog(run, run.illness === 'plague' ? 'Buboes rise on your neck. Gods above — the plague is upon you.' : 'A fever takes hold. You burn and shiver.', 'bad');
    }
    return;
  }

  // sickness bites once per day
  if (run.tick % TICKS_PER_DAY !== 0) return;
  if (run.illness === 'plague') {
    damage(game, run, QUARTERS_PER_HEART, 'consumed by the plague');
    if (run.alive) pushLog(run, 'The plague claims a heart\'s worth of you. See a doctor, or die.', 'bad');
  } else {
    // fever: minor toll, and a chance to break on its own
    damage(game, run, 1, 'carried off by fever');
    if (run.alive && chance(run, 0.25)) {
      run.illness = 'none';
      pushLog(run, 'Your fever breaks in the night. You will live.', 'good');
    }
  }
}
