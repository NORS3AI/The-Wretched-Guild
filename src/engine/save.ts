// Save / load, versioned with a migration seam, plus offline catch-up (§15).

import type { GameState } from './types';
import { SAVE_VERSION } from './types';
import { storage } from './storage';
import { newGame } from './state';
import { advanceTick } from './engine';
import { bindLog, pushLog } from './helpers';
import { emptyStanding } from './factions';
import { emptySkills } from './skills';

const SAVE_KEY = 'wretched-guild/save';

// The game keeps running "in the background": whenever you return (reload, or a
// hidden tab regaining focus), elapsed real time is simulated forward. It runs
// slower than live play so you don't return to a corpse, and is capped.
const OFFLINE_TICK_MS = 3000; // 1 tick per 3 real seconds away
const OFFLINE_MAX_TICKS = 2400; // at most ~2 hours of real absence simulated

export function saveGame(game: GameState): void {
  game.lastSavedAt = Date.now();
  storage.save(SAVE_KEY, JSON.stringify(game));
}

export function clearSave(): void {
  storage.remove(SAVE_KEY);
}

export function loadGame(): GameState {
  const raw = storage.load(SAVE_KEY);
  if (!raw) return newGame();

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return newGame();
  }

  const game = migrate(data);
  catchUpOffline(game);
  return game;
}

/** Bring older saves forward. Each step backfills fields a newer version added. */
function migrate(data: unknown): GameState {
  const g = data as GameState;
  if (!g || typeof g !== 'object' || typeof g.version !== 'number' || !g.run) {
    return newGame();
  }
  // v1 → v2: factions & rank were added to the run.
  if (g.version < 2) {
    if (!g.run.factions) g.run.factions = emptyStanding();
    if (typeof g.run.rank !== 'number') g.run.rank = 1;
    if (g.meta && typeof g.meta.bestRank !== 'number') g.meta.bestRank = 1;
    g.version = 2;
  }
  // v2 → v3: owned businesses were added to the run.
  if (g.version < 3) {
    if (!g.run.businesses) g.run.businesses = {};
    g.version = 3;
  }
  // v3 → v4: the Guild roster and recruit pool were added.
  if (g.version < 4) {
    if (!g.run.members) g.run.members = [];
    if (!g.run.recruits) g.run.recruits = [];
    if (typeof g.run.guildUnpaidTicks !== 'number') g.run.guildUnpaidTicks = 0;
    g.version = 4;
  }
  // v4 → v5: rites of passage on the extended ladder.
  if (g.version < 5) {
    if (!g.run.milestones) g.run.milestones = {};
    g.version = 5;
  }
  // v5 → v6: the beggar-phase survival layer (hearts, needs, inventory, tokens).
  if (g.version < 6) {
    const r = g.run as unknown as Record<string, unknown>;
    if (r.attrs && typeof (r.attrs as Record<string, number>).luck !== 'number') {
      (r.attrs as Record<string, number>).luck = 2;
      (r.attrs as Record<string, number>).vitality = 3;
    }
    if (typeof r.hp !== 'number') {
      r.hp = 12;
      r.heartsBonus = 0;
    }
    if (!r.needs) r.needs = { food: 80, water: 80, comfort: 80, hygiene: 70, relief: 90 };
    if (!r.illness) r.illness = 'none';
    if (typeof r.waterskinCharges !== 'number') {
      r.waterskinCharges = 4;
      r.waterskinMax = 4;
    }
    if (!r.pockets) r.pockets = [null, null];
    if (!r.learnings) r.learnings = {};
    if (typeof r.peakCoin !== 'number') r.peakCoin = (r.coin as number) ?? 0;
    if (g.meta && typeof g.meta.tokens !== 'number') g.meta.tokens = 0;
    g.version = 6;
  }
  // v6 → v7: the stocks (imprisonment).
  if (g.version < 7) {
    if (typeof (g.run as unknown as Record<string, unknown>).stocksUntil === 'undefined') {
      g.run.stocksUntil = null;
    }
    g.version = 7;
  }
  // v7 → v8: the warmth buff.
  if (g.version < 8) {
    if (typeof (g.run as unknown as Record<string, unknown>).warmUntil !== 'number') {
      g.run.warmUntil = 0;
    }
    g.version = 8;
  }
  // v8 → v9: skills.
  if (g.version < 9) {
    if (!g.run.skills) g.run.skills = emptySkills();
    g.version = 9;
  }
  g.version = SAVE_VERSION;
  return g;
}

/** Simulate the game forward for real time spent away (reload, or a hidden tab
 *  regaining focus) — bounded, and skipped while an encounter or the stocks are
 *  pending. Re-anchors lastSavedAt so it can be called repeatedly. */
export function catchUpOffline(game: GameState): void {
  const now = Date.now();
  const elapsedMs = now - (game.lastSavedAt ?? now);
  game.lastSavedAt = now;
  if (elapsedMs < OFFLINE_TICK_MS) return;
  if (!game.run.alive || game.run.encounter) return;

  const ticks = Math.min(OFFLINE_MAX_TICKS, Math.floor(elapsedMs / OFFLINE_TICK_MS));
  if (ticks <= 0) return;

  const coinBefore = game.run.coin;
  for (let i = 0; i < ticks; i++) {
    if (!game.run.alive || game.run.encounter) break;
    advanceTick(game);
  }

  bindLog(game);
  const gained = Math.floor(game.run.coin - coinBefore);
  const mins = Math.round((ticks * OFFLINE_TICK_MS) / 60000);
  pushLog(
    game.run,
    `While you were away (~${mins} min), the world turned on${gained > 0 ? ` and you earned ${gained} copper` : ''}.`,
    'system',
  );
}

export { SAVE_VERSION };
