// The bridge between the pure engine and Svelte. Holds the single GameState,
// drives the tick loop, exposes commands, and autosaves. The engine mutates the
// state object in place; we notify subscribers by re-setting the store.

import { writable } from 'svelte/store';
import type { GameState } from '../engine/types';
import type { Command } from '../engine/engine';
import { advanceTick, dispatch } from '../engine/engine';
import { loadGame, saveGame, clearSave, catchUpOffline } from '../engine/save';
import { newGame } from '../engine/state';
import { REAL_MS_PER_TICK } from '../engine/timeconst';

function hidden(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden';
}

// The loop fires every REAL_MS_PER_TICK (0.5s) and processes `speed` ticks each
// time, so 1× is a lively ~2 ticks/sec and 10× rips through downtime.
const TICK_MS = REAL_MS_PER_TICK;

let game: GameState = loadGame();

const store = writable<GameState>(game);
export const gameStore = store;

function notify(): void {
  store.set(game);
}

// ── tick loop ───────────────────────────────────────────────────────────────────

let saveAcc = 0;
let ticking = false; // guard against overlap/re-entrancy
setInterval(() => {
  if (ticking) return;
  // While the tab is hidden, we don't tick here (browsers throttle timers);
  // the elapsed time is simulated in one bounded batch when the tab returns.
  if (hidden()) return;
  ticking = true;
  try {
    if (!game.paused && game.run.alive && !game.run.encounter) {
      const steps = Math.max(1, Math.min(50, game.speed | 0));
      for (let i = 0; i < steps; i++) {
        advanceTick(game);
        if (!game.run.alive || game.run.encounter) break;
      }
      notify();
    }
    saveAcc += TICK_MS;
    if (saveAcc >= 5000) {
      saveAcc = 0;
      saveGame(game);
    }
  } catch (err) {
    // A bug in the sim must never hang or blank the page — pause and report.
    console.error('Tick error:', err);
    game.paused = true;
    notify();
  } finally {
    ticking = false;
  }
}, TICK_MS);

// Background progress: anchor on hide/exit, and simulate elapsed time on return.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => saveGame(game));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      saveGame(game); // anchor lastSavedAt so time-away is measured from here
    } else {
      catchUpOffline(game); // simulate what happened while we were hidden
      saveGame(game);
      notify();
    }
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
  payStocks: () => run({ type: 'payStocks' }),
  investBusiness: (id: string) => run({ type: 'investBusiness', id }),
  recruitMember: (id: string) => run({ type: 'recruitMember', id }),
  dismissMember: (id: string) => run({ type: 'dismissMember', id }),
  assignMember: (memberId: string, jobId: string | null) => run({ type: 'assignMember', memberId, jobId }),
  rerollRecruits: () => run({ type: 'rerollRecruits' }),
  doDeed: (id: string) => run({ type: 'doDeed', id }),
  eatItem: (id: string) => run({ type: 'eatItem', id }),
  sellItem: (id: string) => run({ type: 'sellItem', id }),
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
