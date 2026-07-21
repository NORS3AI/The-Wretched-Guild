// Fresh-state construction. New games and new lives are born here.

import type { GameState, MetaState, RunState } from './types';
import { SAVE_VERSION } from './types';
import { freshSeed } from './rng';
import { emptyStanding } from './factions';
import { maxHp } from './survival';
import { emptySkills } from './skills';
import { HOUR_LENGTH_MS, START_HOUR } from './timeconst';

export const CONTRACT_FIRST_OFFER = 30; // ticks before the first contract appears
export const CONTRACT_COOLDOWN = 90; // ticks between contract offers
export const MERCHANT_FIRST_VISIT = 60; // ticks before a wandering merchant first appears
export const MERCHANT_COOLDOWN = 120; // ticks between merchant visits
export const EVENT_FIRST = 45; // ticks before the first random event
export const EVENT_COOLDOWN_MIN = 80; // ticks between random events (low)
export const EVENT_COOLDOWN_MAX = 160; // ticks between random events (high)

export function newMeta(): MetaState {
  return {
    legacy: 0,
    vault: 0,
    runsCompleted: 0,
    bestAge: 0,
    bestCoin: 0,
    bestRank: 1,
    tokens: 0,
    illicitWarningSeen: false,
    unlocks: {},
  };
}

/** Start a new life. Meta-unlocks (§4) shape the starting conditions. */
export function newRun(meta: MetaState): RunState {
  const lvl = (id: string): number => meta.unlocks[id] ?? 0;
  const startCoin = 15 * lvl('stashed_coin') + Math.floor(meta.vault); // +15 copper per level
  const heartsBonus = lvl('hardened'); // +1 heart per level
  // Luck comes from the Beggar's Luck unlock (+2/level) AND from the Legacy you
  // keep unspent: every 10 Legacy held is worth 1% Luck, and 1% = 0.1 on the Luck
  // attribute — so 10 kept Legacy adds 0.1 Luck. Spend Legacy and you trade that
  // Luck away. Capped at the 100 attribute ceiling.
  const legacyLuck = Math.floor((meta.legacy ?? 0) / 10) * 0.1;
  const startLuck = Math.min(100, 2 * lvl('beggars_luck') + legacyLuck);

  const run: RunState = {
    seed: freshSeed(),
    rngCursor: 0,
    tick: 0,
    dayMs: START_HOUR * HOUR_LENGTH_MS, // begin the day at 8 in the morning
    ageYears: 16,
    alive: true,
    deathCause: null,
    hp: 0, // set below once maxHp is known
    heartsBonus,
    needs: { food: 100, water: 100, comfort: 100, hygiene: 100, relief: 100 },
    illness: 'none',
    starveClock: 0,
    filthClock: 0,
    starveHits: 0,
    pickpocketStrikes: 0,
    waterskinCharges: 4,
    waterskinMax: 4,
    warmClothes: false,
    weatherproof: false,
    hasBow: false,
    craftingUnlocked: false,
    oilBuffMs: 0,
    pockets: [null, null],
    // the six-slot food larder — a wretch starts with a crust of bread
    larder: [{ item: 'bread', qty: 1 }, null, null, null, null, null],
    pocketSlots: 2,
    pouches: 0,
    container: 0,
    learnings: {},
    coin: startCoin,
    peakCoin: startCoin,
    heat: 0,
    // attributes start at 0 and cap at 100, grown slowly through use
    attrs: {
      cunning: 0,
      brawn: 0,
      charm: 0,
      stealth: 0,
      piety: 0,
      wits: 0,
      luck: startLuck,
      vitality: 0,
    },
    alignment: { ethics: 0, morals: 0 },
    skills: emptySkills(),
    rank: 1,
    milestones: {},
    factions: emptyStanding(),
    businesses: {},
    servants: {},
    members: [],
    recruits: [],
    guildUnpaidTicks: 0,
    activity: null,
    encounter: null,
    stocksUntil: null,
    warmUntil: 0,
    contractAvailable: false,
    contractTargetId: null,
    contractCooldown: CONTRACT_FIRST_OFFER,
    contractsOffered: 0,
    contractFates: {},
    merchantHere: false,
    merchantCooldown: MERCHANT_FIRST_VISIT,
    eventCooldown: EVENT_FIRST,
    legacyThisRun: 0,
  };
  run.hp = maxHp(run);
  return run;
}

export function newGame(): GameState {
  const meta = newMeta();
  return {
    version: SAVE_VERSION,
    run: newRun(meta),
    meta,
    log: [
      {
        tick: 0,
        kind: 'system',
        text: 'You wake in the mud of an English gutter, sixteen years old and worth nothing. The bells of a distant church toll. Somewhere above you, there is a throne.',
      },
    ],
    paused: false,
    speed: 1,
    lastSavedAt: Date.now(),
    settings: defaultSettings(),
  };
}

export function defaultSettings(): Record<string, boolean> {
  return { screenFlash: true, coinMessages: true, idleMessages: true };
}
