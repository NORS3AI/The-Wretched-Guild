// Fresh-state construction. New games and new lives are born here.

import type { GameState, MetaState, RunState } from './types';
import { SAVE_VERSION } from './types';
import { freshSeed } from './rng';
import { emptyStanding } from './factions';
import { maxHp } from './survival';

export const CONTRACT_FIRST_OFFER = 30; // ticks before the first contract appears
export const CONTRACT_COOLDOWN = 90; // ticks between contract offers

export function newMeta(): MetaState {
  return {
    legacy: 0,
    vault: 0,
    runsCompleted: 0,
    bestAge: 0,
    bestCoin: 0,
    bestRank: 1,
    tokens: 0,
    unlocks: {},
  };
}

/** Start a new life. Meta-unlocks (§4) shape the starting conditions. */
export function newRun(meta: MetaState): RunState {
  const startCoin = 0 + (meta.unlocks['stashed_coin'] ? 30 : 0) + Math.floor(meta.vault);
  const heartsBonus = meta.unlocks['hardened'] ? 1 : 0;
  const startLuck = meta.unlocks['beggars_luck'] ? 5 : 2;

  const run: RunState = {
    seed: freshSeed(),
    rngCursor: 0,
    tick: 0,
    ageYears: 16,
    alive: true,
    deathCause: null,
    hp: 0, // set below once maxHp is known
    heartsBonus,
    needs: { food: 80, water: 80, comfort: 80, hygiene: 70, relief: 90 },
    illness: 'none',
    waterskinCharges: 4,
    waterskinMax: 4,
    pockets: [
      { item: 'bread', qty: 1 },
      null,
    ],
    learnings: {},
    coin: startCoin,
    peakCoin: startCoin,
    heat: 0,
    attrs: {
      cunning: 3,
      brawn: 3,
      charm: 3,
      stealth: 3,
      piety: 3,
      wits: 3,
      luck: startLuck,
      vitality: 3,
    },
    alignment: { ethics: 0, morals: 0 },
    rank: 1,
    milestones: {},
    factions: emptyStanding(),
    businesses: {},
    members: [],
    recruits: [],
    guildUnpaidTicks: 0,
    activity: null,
    encounter: null,
    contractAvailable: false,
    contractCooldown: CONTRACT_FIRST_OFFER,
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
  };
}
