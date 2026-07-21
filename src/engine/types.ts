// ── The Wretched Guild — core state types ────────────────────────────────────
// The engine is framework-free and deterministic. Everything the game needs to
// resume is inside GameState; nothing lives in the UI.

import type { FactionId } from './factions';

export const SAVE_VERSION = 23;

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
  luck: number; // sways opportunities and events
  vitality: number; // endurance — extends maximum hearts
}

/** A single item stack in a pocket. */
export interface ItemStack {
  item: string; // ItemDef id
  qty: number;
}

/** Survival needs, each 0..100 where 100 = fully satisfied (§ beggar phase). */
export interface Needs {
  food: number;
  water: number;
  comfort: number; // exposure — drained by cold or heat
  hygiene: number;
  relief: number; // bladder/bowel; 0 = desperate
}

export type Illness = 'none' | 'fever' | 'plague';

export type AttrKey = keyof Attributes;

export interface ActiveActivity {
  id: string;
  /** ticks elapsed in the current cycle */
  progress: number;
}

/** A live, in-progress interactive encounter (§8 of the design doc). */
/** A recruited wretch who works for the Guild in parallel (§12). Their own
 *  alignment decides which jobs they will accept. */
export interface Member {
  id: string;
  name: string;
  archetype: string;
  skill: number; // 1..40 primary competence, grows with work
  alignment: Alignment;
  job: string | null; // assigned MemberJob id
  upkeep: number; // coin/tick wage
  heat: number; // their own notoriety, feeds risk
}

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

  tick: number; // total ticks this life (the sim clock — drives growth)
  /** the day/night clock, in real ms — a SEPARATE 6-minute-per-day timer that
   *  only sets the time of day and the shop/church/tavern schedule. */
  dayMs: number;
  ageYears: number;

  alive: boolean;
  deathCause: string | null;

  /** hearts, measured in quarters. maxHp() derives the cap from vitality + bonus. */
  hp: number;
  heartsBonus: number; // extra whole hearts from meta unlocks

  /** survival state (§ beggar phase) */
  needs: Needs;
  illness: Illness;
  /** hours accumulated toward the next starvation / filth heart-loss */
  starveClock: number;
  filthClock: number;
  /** count of starvation heart-losses this life — drives the screen flash */
  starveHits: number;
  /** times caught pickpocketing since the last stocks — 7 lands you in them */
  pickpocketStrikes: number;
  waterskinCharges: number;
  waterskinMax: number;
  /** warm woollens bought from the merchant — keep the cold from draining comfort */
  warmClothes: boolean;
  /** an all-weather hat bought from the merchant — wards off BOTH cold and heat */
  weatherproof: boolean;
  /** a hunting bow bought from the merchant — unlocks the Hunter trade */
  hasBow: boolean;
  /** the Crafting tab has been opened (latched true the first time the player
   *  holds 2 coal + 1 iron ore — it never closes again once earned) */
  craftingUnlocked: boolean;
  /** dev "Chalice of Infinite Oil" buff — real-time ms remaining during which
   *  cooking needs no physical Goblet of Oil */
  oilBuffMs: number;
  pockets: (ItemStack | null)[];
  /** the food larder — six slots reserved for food, apart from the pockets */
  larder: (ItemStack | null)[];
  /** carry-capacity ladder: base pockets (2–6), belt pouches (×2 slots each,
   *  belt holds up to 6), and the owned container tier (satchel … wagon). */
  pocketSlots: number;
  pouches: number;
  container: number;
  learnings: Record<string, boolean>; // semi-upgrades learned this life

  coin: number; // base currency: COPPER (see money.ts)
  peakCoin: number; // most copper held this life (for tokens)
  heat: number; // 0..100 notoriety

  attrs: Attributes;
  alignment: Alignment;
  /** RuneScape-style skills trained by doing (fishing, cooking, …) */
  skills: Record<string, number>;

  /** current position on the 100-rung ladder (§13) */
  rank: number;
  /** rites of passage already undertaken, by id */
  milestones: Record<string, boolean>;
  /** standing with each faction (§9) */
  factions: Record<FactionId, number>;
  /** owned ventures by id → level (§11) */
  businesses: Record<string, number>;
  /** hired household servant groups by id → hired (§14, rank 50+) */
  servants: Record<string, boolean>;
  /** the three Ply-Your-Trade tasks the rank-100 labourers work, by activity id
   *  (null = an empty slot). The player chooses these in the Household. */
  labourerTrades: (string | null)[];
  /** which enterprise each foreman is set to run, by foreman servant id →
   *  business id (null/absent = idle). The player assigns these in the Household. */
  foremanEnterprises: Record<string, string | null>;
  /** the Guild roster and the current pool of candidates (§12) */
  members: Member[];
  recruits: Member[];
  /** consecutive ticks the roster has gone underpaid */
  guildUnpaidTicks: number;

  activity: ActiveActivity | null;
  /** a SEPARATE, parallel activity slot just for the Crafting benches — crafting
   *  runs alongside your trade or enterprise work, not instead of it. */
  craftActivity: ActiveActivity | null;
  encounter: EncounterRuntime | null;

  /** if imprisoned, the tick at which the stocks release you (null = free) */
  stocksUntil: number | null;
  /** tick until which the cold cannot touch you (from seeking warmth) */
  warmUntil: number;

  /** a contract is waiting on the board to be accepted */
  contractAvailable: boolean;
  /** which mark the waiting contract is for (null when none) */
  contractTargetId: string | null;
  /** ticks until the next contract is offered */
  contractCooldown: number;
  /** how many contracts have been offered this life (first is always Osric) */
  contractsOffered: number;
  /** the fate of each mark this life: killed marks never return, spared can */
  contractFates: Record<string, 'dead' | 'spared'>;

  /** a wandering merchant is in town (stays until the player waves them off) */
  merchantHere: boolean;
  /** ticks until the wandering merchant next comes to town */
  merchantCooldown: number;
  /** ticks until the next random town event springs up */
  eventCooldown: number;

  legacyThisRun: number;
}

export interface MetaState {
  legacy: number; // spendable meta-currency
  vault: number; // coin carried across deaths
  runsCompleted: number;
  bestAge: number;
  bestCoin: number;
  bestRank: number;
  tokens: number; // Wretched Tokens — rare prestige, in 0.25 steps
  /** the one-time permadeath warning has been shown & acknowledged */
  illicitWarningSeen: boolean;
  /** meta-unlocks by id → level owned (0 = not bought) */
  unlocks: Record<string, number>;
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
  /** UI/gameplay toggles (screen flash, message verbosity, …) */
  settings: Record<string, boolean>;
}
