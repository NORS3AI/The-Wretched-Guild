// The bridge between the pure engine and Svelte. Holds the single GameState,
// drives the tick loop, exposes commands, and autosaves. The engine mutates the
// state object in place; we notify subscribers by re-setting the store.

import { writable } from 'svelte/store';
import type { GameState } from '../engine/types';
import type { Command } from '../engine/engine';
import { advanceTick, dispatch } from '../engine/engine';
import { loadGame, saveGame, clearSave } from '../engine/save';
import { newGame } from '../engine/state';
import { REAL_MS_PER_TICK } from '../engine/timeconst';

// Real-time pacing: one in-game DAY takes 20 minutes at 1× (10 at 2×, 5 at 4×).
// REAL_MS_PER_TICK derives from that and TICKS_PER_DAY, so game balance (measured
// in ticks) is completely independent of wall-clock pacing.
const POLL_MS = 1000; // how often we check the clock

let game: GameState = loadGame();

const store = writable<GameState>(game);
export const gameStore = store;

function notify(): void {
  store.set(game);
}

// ── tick loop (real-time accumulator) ───────────────────────────────────────────

let acc = 0; // accumulated game-time in ms, scaled by speed
let saveAcc = 0;
setInterval(() => {
  if (!game.paused && game.run.alive && !game.run.encounter) {
    acc += POLL_MS * game.speed;
    let ticked = false;
    while (acc >= REAL_MS_PER_TICK) {
      acc -= REAL_MS_PER_TICK;
      advanceTick(game);
      ticked = true;
      if (!game.run.alive || game.run.encounter) {
        acc = 0;
        break;
      }
    }
    if (ticked) notify();
  } else {
    acc = 0; // don't bank time while paused/dead/in an encounter
  }

  saveAcc += POLL_MS;
  if (saveAcc >= 5000) {
    saveAcc = 0;
    saveGame(game);
  }
}, POLL_MS);

// save on the way out so offline progress has an accurate anchor
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => saveGame(game));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveGame(game);
  });
}

// ── commands (the only way the UI changes state) ────────────────────────────────

function run(cmd: Command): void {
  dispatch(game, cmd);
  saveGame(game);
  notify();
}

export const actions = {
  setActivity: (id: string | null) => run({ type: 'setActivity', id }),
  acceptContract: () => run({ type: 'acceptContract' }),
  chooseEncounter: (index: number) => run({ type: 'chooseEncounter', index }),
  seekAdvancement: () => run({ type: 'seekAdvancement' }),
  investBusiness: (id: string) => run({ type: 'investBusiness', id }),
  recruitMember: (id: string) => run({ type: 'recruitMember', id }),
  dismissMember: (id: string) => run({ type: 'dismissMember', id }),
  assignMember: (memberId: string, jobId: string | null) => run({ type: 'assignMember', memberId, jobId }),
  rerollRecruits: () => run({ type: 'rerollRecruits' }),
  doDeed: (id: string) => run({ type: 'doDeed', id }),
  beginNewLife: () => run({ type: 'beginNewLife' }),
  buyUnlock: (id: string) => run({ type: 'buyUnlock', id }),

  setSpeed: (speed: number) => {
    game.speed = speed;
    game.paused = false;
    notify();
  },
  togglePause: () => {
    game.paused = !game.paused;
    notify();
  },

  resetEverything: () => {
    clearSave();
    game = newGame();
    saveGame(game);
    notify();
  },
};
