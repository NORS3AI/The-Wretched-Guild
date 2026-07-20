// Small shared mutators used across the engine.

import type { AttrKey, GameState, LogEntry, RunState } from './types';
import type { FactionId } from './factions';
import { factionById } from './factions';
import { nextFloat } from './rng';

const LOG_LIMIT = 120;

// The log lives on GameState, but most engine code holds only RunState. We stash
// a reference to the active log array so helpers can append without threading it
// through every call. Set once per tick batch by the engine.
let activeLog: LogEntry[] | null = null;

export function bindLog(game: GameState): void {
  activeLog = game.log;
}

export function pushLog(run: RunState, text: string, kind: LogEntry['kind'] = 'plain'): void {
  if (!activeLog) return;
  activeLog.push({ tick: run.tick, text, kind });
  if (activeLog.length > LOG_LIMIT) activeLog.splice(0, activeLog.length - LOG_LIMIT);
}

/** Attributes range 0–100. Grow slowly through use — a random 0.03–0.06 per
 *  action (the "quick study" teaching speeds it up). */
export function trainAttr(run: RunState, key: AttrKey, _amount = 1): void {
  const mult = run.learnings && run.learnings['quick_study'] ? 1.5 : 1;
  const gain = (0.03 + nextFloat(run) * 0.03) * mult;
  run.attrs[key] = Math.min(100, run.attrs[key] + gain);
}

/** Raise an attribute by a random amount in [lo, hi], capped at 100 — for the
 *  chance-based per-activity bonuses. */
export function raiseAttr(run: RunState, key: AttrKey, lo: number, hi: number): void {
  run.attrs[key] = Math.min(100, run.attrs[key] + lo + nextFloat(run) * (hi - lo));
}

/** Build faction standing — but only if your alignment admits the path (§9).
 *  Returns the amount actually gained (0 if the faction bars your alignment). */
export function gainStanding(run: RunState, faction: FactionId, amount: number): number {
  if (!factionById(faction).admits(run.alignment)) return 0;
  run.factions[faction] = Math.max(0, Math.min(100, run.factions[faction] + amount));
  return amount;
}
