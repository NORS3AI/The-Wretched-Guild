// The bridge between the pure engine and Svelte. Holds the single GameState,
// drives the tick loop, exposes commands, and autosaves. The engine mutates the
// state object in place; we notify subscribers by re-setting the store.

import { writable } from 'svelte/store';
import type { GameState } from '../engine/types';
import type { Command } from '../engine/engine';
import { advanceTick, dispatch } from '../engine/engine';
import { loadGame, saveGame, clearSave } from '../engine/save';
import { newGame } from '../engine/state';

const TICK_MS = 500; // one real-time step; `speed` ticks are processed per step

let game: GameState = loadGame();

const store = writable<GameState>(game);
export const gameStore = store;

function notify(): void {
  store.set(game);
}

// ── tick loop ─────────────────────────────────────────────────────────────────

let acc = 0;
setInterval(() => {
  if (game.paused || !game.run.alive || game.run.encounter) return;
  const steps = game.speed;
  for (let i = 0; i < steps; i++) {
    advanceTick(game);
    if (!game.run.alive || game.run.encounter) break;
  }
  notify();

  // autosave roughly every 5s of wall-clock
  acc += TICK_MS;
  if (acc >= 5000) {
    acc = 0;
    saveGame(game);
  }
}, TICK_MS);

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
