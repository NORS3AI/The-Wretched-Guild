// Save / load, versioned with a migration seam, plus offline catch-up (§15).

import type { GameState } from './types';
import { SAVE_VERSION } from './types';
import { storage } from './storage';
import { newGame } from './state';
import { advanceTick } from './engine';
import { bindLog, pushLog } from './helpers';

const SAVE_KEY = 'wretched-guild/save';

// Offline is generous but bounded, so a week away doesn't fast-forward you to
// death — and encounters never auto-resolve while you were gone.
const OFFLINE_TICK_MS = 3000; // one tick of idle progress per 3 real seconds
const OFFLINE_MAX_TICKS = 1200; // ~1 hour of real time, at most

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
  applyOfflineProgress(game);
  return game;
}

/** Bring older saves forward. Today there is only v1; the seam is what matters. */
function migrate(data: unknown): GameState {
  const g = data as GameState;
  if (!g || typeof g !== 'object' || typeof g.version !== 'number') {
    return newGame();
  }
  // future: while (g.version < SAVE_VERSION) { ...bump fields...; g.version++ }
  g.version = SAVE_VERSION;
  return g;
}

/** Simulate the idle layer forward for time spent away — bounded, and skipped
 *  entirely while an encounter is pending (set pieces wait for the player). */
function applyOfflineProgress(game: GameState): void {
  const elapsedMs = Date.now() - (game.lastSavedAt ?? Date.now());
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
  const gained = game.run.coin - coinBefore;
  const mins = Math.round((ticks * OFFLINE_TICK_MS) / 60000);
  pushLog(
    game.run,
    `While you were away (~${mins} min), your labours continued${gained > 0 ? ` and earned ${gained} coin` : ''}.`,
    'system',
  );
}

export { SAVE_VERSION };
