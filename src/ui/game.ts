// The bridge between the pure engine and Svelte. Holds the single GameState,
// drives the tick loop, exposes commands, and autosaves. The engine mutates the
// state object in place; we notify subscribers by re-setting the store.

import { writable, get } from 'svelte/store';
import type { GameState } from '../engine/types';
import type { Command } from '../engine/engine';
import { advanceTick, dispatch } from '../engine/engine';
import { loadGame, saveGame, clearSave, catchUpOffline } from '../engine/save';
import { newGame } from '../engine/state';
import { REAL_MS_PER_TICK, DAY_LENGTH_MS } from '../engine/timeconst';

function hidden(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden';
}

// Bumped whenever the player should see a red danger flash (a starvation heart-
// loss). A separate store so it never touches the save.
export const dangerFlash = writable(0);
export const settingsOpen = writable(false);
export const patchOpen = writable(false);
export const legacyOpen = writable(false);
export const devOpen = writable(false);

// Which panel fills the main column (Ply Your Trade by default, or one of the
// tabbed panels). Purely a view concern, so it lives outside the save.
export type SideTab = 'wretch' | 'events' | 'trade' | 'merchant' | 'needs' | 'enterprises' | 'wretched' | 'reputation';
export const activeTab = writable<SideTab>('wretch');
// The topbar's Bearing button toggles a small popover with the alignment axes.
export const bearingOpen = writable(false);
// The topbar's Purse button toggles a popover with the full wealth ladder.
export const purseOpen = writable(false);
let lastStarveHits = 0;
function checkFlash(): void {
  if (game.run.starveHits > lastStarveHits) {
    if (game.settings?.screenFlash) dangerFlash.update((n) => n + 1);
    lastStarveHits = game.run.starveHits;
  }
}

// The render loop repaints ~10×/sec; game-ticks advance on an accumulator fed by
// MEASURED real time (not the nominal interval, which drifts slower than the wall
// clock under load) so the sim, the clock, the activity bars, and the Chronicle
// all stay in lock-step — the log now lands the instant a cycle finishes.
const RENDER_MS = 100;
const MAX_TICKS_PER_FRAME = 400; // safety clamp
let tickAcc = 0;
let lastFrame = Date.now();

let game: GameState = loadGame();

const store = writable<GameState>(game);
export const gameStore = store;

// When an encounter or the stocks opens (a random event, an accepted contract, a
// Rite of Passage, or a punishment), whisk the player to the Events tab so they
// always see it — then return them to where they were once it's resolved.
let lastEventActive = false;
let preEventTab: SideTab = 'wretch';
function syncEventTab(): void {
  const active = game.run.alive && (game.run.encounter !== null || game.run.stocksUntil !== null);
  if (active && !lastEventActive) {
    preEventTab = get(activeTab);
    activeTab.set('events');
  } else if (!active && lastEventActive) {
    // only pull them back if they're still parked on the (now empty) Events tab
    if (get(activeTab) === 'events') activeTab.set(preEventTab);
  }
  lastEventActive = active;
}

function notify(): void {
  syncEventTab();
  store.set(game);
}

// ── tick loop ───────────────────────────────────────────────────────────────────

let saveAcc = 0;
let ticking = false; // guard against overlap/re-entrancy
setInterval(() => {
  if (ticking) return;
  // While the tab is hidden, we don't tick here (browsers throttle timers); the
  // elapsed time is simulated in one bounded batch when the tab returns. Keep the
  // frame anchor current so returning doesn't jump.
  if (hidden()) {
    lastFrame = Date.now();
    return;
  }
  ticking = true;
  try {
    const now = Date.now();
    const elapsed = Math.min(1000, Math.max(0, now - lastFrame)); // measured, clamped
    lastFrame = now;
    if (!game.paused && game.run.alive) {
      const wasAlive = game.run.alive;
      const dt = elapsed * Math.max(1, game.speed | 0);
      // the day/night clock runs on its own real-time timer (6 min per day)
      game.run.dayMs += dt;
      // the sim clock advances a whole tick at a time from the same real time —
      // this continues even with an encounter open (the player can leave it)
      tickAcc += dt;
      let did = 0;
      while (tickAcc >= REAL_MS_PER_TICK && did < MAX_TICKS_PER_FRAME) {
        tickAcc -= REAL_MS_PER_TICK;
        advanceTick(game);
        did++;
        if (!game.run.alive) {
          tickAcc = 0; // don't carry time across a death
          break;
        }
      }
      // repaint every frame so the clock, bars, and Chronicle stay live
      notify();
      if (did > 0) {
        checkFlash();
        // death banks this life's Legacy/Tokens into meta — persist it at once so
        // a reload on the death screen can't lose the just-earned prestige.
        if (wasAlive && !game.run.alive) saveGame(game);
      }
    }
    saveAcc += elapsed;
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
      // advance the day/night clock by the real time spent away (capped to a day)
      // — but only if the game was actually running, not paused.
      const awayMs = Date.now() - (game.lastSavedAt ?? Date.now());
      if (!game.paused && game.run.alive) game.run.dayMs += Math.min(Math.max(0, awayMs), DAY_LENGTH_MS);
      catchUpOffline(game); // simulate what happened while we were hidden (skips if paused)
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
  declineContract: () => run({ type: 'declineContract' }),
  dismissEncounter: () => run({ type: 'dismissEncounter' }),
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
  buyGear: (kind: 'waterskin' | 'warm_clothes' | 'hat' | 'bow') => run({ type: 'buyGear', kind }),
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
  clearLog: () => {
    game.log.length = 0; // clear in place so the engine's log binding stays valid
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

  // ── dev panel cheats ────────────────────────────────────────────────────────
  addDiamond: () => {
    game.run.coin += 1e36; // one diamond's worth of copper
    game.run.peakCoin = Math.max(game.run.peakCoin, game.run.coin);
    saveGame(game);
    notify();
  },
  maxFactions: () => {
    for (const k of Object.keys(game.run.factions)) {
      (game.run.factions as Record<string, number>)[k] = 100;
    }
    saveGame(game);
    notify();
  },
};
