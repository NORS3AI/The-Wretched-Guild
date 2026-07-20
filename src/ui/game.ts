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

// Bumped whenever the player should see a red danger flash (a starvation heart-
// loss). A separate store so it never touches the save.
export const dangerFlash = writable(0);
export const settingsOpen = writable(false);
export const patchOpen = writable(false);
let lastStarveHits = 0;
function checkFlash(): void {
  if (game.run.starveHits > lastStarveHits) {
    if (game.settings?.screenFlash) dangerFlash.update((n) => n + 1);
    lastStarveHits = game.run.starveHits;
  }
}

// The render loop repaints a few times a second; game-ticks advance on a real-
// time accumulator (one tick per REAL_MS_PER_TICK of speed-scaled time). This
// keeps the clock and bars smooth at every speed — at 1× a tick lands every 15s
// (a 6-minute day), and 10× skips through it smoothly rather than in big chunks.
const RENDER_MS = 500;
const MAX_TICKS_PER_FRAME = 200; // safety clamp
let tickAcc = 0;

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
      const wasAlive = game.run.alive;
      // bank this frame's worth of speed-scaled real time, then spend it a
      // whole tick at a time.
      tickAcc += RENDER_MS * Math.max(1, game.speed | 0);
      let did = 0;
      while (tickAcc >= REAL_MS_PER_TICK && did < MAX_TICKS_PER_FRAME) {
        tickAcc -= REAL_MS_PER_TICK;
        advanceTick(game);
        did++;
        if (!game.run.alive || game.run.encounter) {
          tickAcc = 0; // don't carry time across a death or an open encounter
          break;
        }
      }
      if (did > 0) {
        notify();
        checkFlash();
        // death banks this life's Legacy/Tokens into meta — persist it at once so
        // a reload on the death screen can't lose the just-earned prestige.
        if (wasAlive && !game.run.alive) saveGame(game);
      }
    }
    saveAcc += RENDER_MS;
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
}, RENDER_MS);

// Background progress: anchor on hide/exit, and simulate elapsed time on return.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => saveGame(game));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      saveGame(game); // anchor lastSavedAt so time-away is measured from here
    } else {
      catchUpOffline(game); // simulate what happened while we were hidden
      lastStarveHits = game.run.starveHits; // don't flash for offline progress
      saveGame(game);
      notify();
    }
  });
}

// ── one-time permadeath warning for illicit acts ─────────────────────────────

// A separate store so a transient modal flag never ends up in the save file.
export const illicitWarning = writable(false);

function isIllicit(cmd: Command): boolean {
  return (cmd.type === 'setActivity' && cmd.id === 'pickpocket') || cmd.type === 'acceptContract';
}

// ── commands (the only way the UI changes state) ────────────────────────────────

function run(cmd: Command): void {
  dispatch(game, cmd);
  // First time the player does something illicit, warn them (once, ever) that
  // dying mid-crime ends the game. Pause until they acknowledge.
  if (isIllicit(cmd) && !game.meta.illicitWarningSeen) {
    game.paused = true;
    illicitWarning.set(true);
  }
  saveGame(game);
  lastStarveHits = game.run.starveHits; // commands don't flash; only ticks do
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
  buyItem: (id: string) => run({ type: 'buyItem', id }),
  buyCarry: (kind: 'pocket' | 'pouch' | 'container') => run({ type: 'buyCarry', kind }),
  dismissMerchant: () => run({ type: 'dismissMerchant' }),
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
  toggleSetting: (id: string) => {
    game.settings = { ...game.settings, [id]: !game.settings[id] };
    saveGame(game);
    notify();
  },
  acknowledgeIllicitWarning: () => {
    game.meta.illicitWarningSeen = true;
    game.paused = false;
    illicitWarning.set(false);
    saveGame(game);
    notify();
  },

  resetEverything: () => {
    clearSave();
    game = newGame();
    saveGame(game);
    notify();
  },
};
