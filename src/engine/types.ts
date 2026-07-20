// ── The Wretched Guild — core state types ────────────────────────────────────
// The engine is framework-free and deterministic. Everything the game needs to
// resume is inside GameState; nothing lives in the UI.

import type { FactionId } from './factions';

export const SAVE_VERSION = 2;

/** Alignment axes, each clamped to [-100, 100].
 *  ethics: +100 Lawful … -100 Chaotic
 *  morals: +100 Good  … -100 Evil */
export interface Alignment {
  ethics: number;
  morals: number;
}

export interface Attributes {
  cunning: number;
  brawn: number;
  charm: number;
  stealth: number;
  piety: number;
  wits: number;
}

export type AttrKey = keyof Attributes;

export interface ActiveActivity {
  id: string;
  /** ticks elapsed in the current cycle */
  progress: number;
}

/** A live, in-progress interactive encounter (§8 of the design doc). */
export interface EncounterRuntime {
  defId: string;
  nodeId: string;
  /** narration shown from the *previous* resolution, above the current node */
  lastOutcomeText: string | null;
}

export interface RunState {
  seed: number;
  /** monotonic cursor into the seeded RNG stream — serializable determinism */
  rngCursor: number;

  tick: number; // total ticks this life
  ageYears: number;

  alive: boolean;
  deathCause: string | null;

  health: number;
  maxHealth: number;
  coin: number;
  heat: number; // 0..100 notoriety

  attrs: Attributes;
  alignment: Alignment;

  /** current position on the 100-rung ladder (§13) */
  rank: number;
  /** standing with each faction (§9) */
  factions: Record<FactionId, number>;

  activity: ActiveActivity | null;
  encounter: EncounterRuntime | null;

  /** a contract is waiting on the board to be accepted */
  contractAvailable: boolean;
  /** ticks until the next contract is offered */
  contractCooldown: number;

  legacyThisRun: number;
}

export interface MetaState {
  legacy: number; // spendable meta-currency
  vault: number; // coin carried across deaths
  runsCompleted: number;
  bestAge: number;
  bestCoin: number;
  bestRank: number;
  unlocks: Record<string, boolean>;
}

export interface LogEntry {
  tick: number;
  text: string;
  kind: 'plain' | 'good' | 'bad' | 'coin' | 'align' | 'death' | 'system';
}

export interface GameState {
  version: number;
  run: RunState;
  meta: MetaState;
  log: LogEntry[];
  paused: boolean;
  speed: number; // 1 | 2 | 4
  lastSavedAt: number; // epoch ms — used for offline catch-up
}
