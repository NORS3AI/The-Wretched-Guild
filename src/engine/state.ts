// Fresh-state construction. New games and new lives are born here.

import type { GameState, MetaState, RunState } from './types';
import { SAVE_VERSION } from './types';
import { freshSeed } from './rng';

export const CONTRACT_FIRST_OFFER = 30; // ticks before the first contract appears
export const CONTRACT_COOLDOWN = 90; // ticks between contract offers

export function newMeta(): MetaState {
  return {
    legacy: 0,
    vault: 0,
    runsCompleted: 0,
    bestAge: 0,
    bestCoin: 0,
    unlocks: {},
  };
}

/** Start a new life. Meta-unlocks (§4) shape the starting conditions. */
export function newRun(meta: MetaState): RunState {
  const startCoin = 0 + (meta.unlocks['stashed_coin'] ? 10 : 0) + Math.floor(meta.vault);
  const bonusHealth = meta.unlocks['hardened'] ? 10 : 0;

  return {
    seed: freshSeed(),
    rngCursor: 0,
    tick: 0,
    ageYears: 16,
    alive: true,
    deathCause: null,
    health: 100 + bonusHealth,
    maxHealth: 100 + bonusHealth,
    coin: startCoin,
    heat: 0,
    attrs: {
      cunning: 3,
      brawn: 3,
      charm: 3,
      stealth: 3,
      piety: 3,
      wits: 3,
    },
    alignment: { ethics: 0, morals: 0 },
    activity: null,
    encounter: null,
    contractAvailable: false,
    contractCooldown: CONTRACT_FIRST_OFFER,
    legacyThisRun: 0,
  };
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
