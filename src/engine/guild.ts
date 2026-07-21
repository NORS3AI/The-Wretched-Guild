// The Guild (§12) — the doer→director turn. Recruit wretches, each with their
// own alignment that gates what work they'll take, assign them to jobs that run
// in parallel, and manage their wages and mortality.

import type { AttrKey, GameState, Member, RunState } from './types';
import type { FactionId } from './factions';
import { factionById } from './factions';
import { nextInt, nextFloat } from './rng';
import { pushLog } from './helpers';

export const GUILD_MIN_RANK = 3; // no one follows a nobody
export const RECRUIT_SLOTS = 3;
export const REROLL_COST = 5;

/** Roster capacity grows as you rise. */
export function maxMembers(rank: number): number {
  if (rank < GUILD_MIN_RANK) return 0;
  return Math.min(8, 1 + Math.floor((rank - 1) / 2));
}

// ── Member jobs ───────────────────────────────────────────────────────────────

export interface MemberJob {
  id: string;
  name: string;
  faction: FactionId;
  baseIncome: number; // coin/tick, before rank & skill scaling
  standingGain: number; // guild faction standing/tick
  heatGain: number; // added to the member's own heat/tick
  risky: boolean;
  /** attributes the MASTER (the player) must have honed to set a wretch to this
   *  duty; the more intensive the work, the steeper the demand — and the pay. */
  req?: Partial<Record<AttrKey, number>>;
}

export const MEMBER_JOBS: MemberJob[] = [
  { id: 'scavenge', name: 'Street Scavenging', faction: 'commons', baseIncome: 0.1, standingGain: 0.02, heatGain: 0, risky: false },
  { id: 'muscle', name: 'Hired Muscle', faction: 'shadow', baseIncome: 0.6, standingGain: 0.04, heatGain: 0.02, risky: true, req: { brawn: 40 } },
  { id: 'assassin', name: 'Assassination', faction: 'shadow', baseIncome: 2_000_000, standingGain: 0.06, heatGain: 0.06, risky: true, req: { stealth: 65 } }, // 2 silver/tick
  { id: 'divine', name: 'Divine Authority', faction: 'church', baseIncome: 10_000_000, standingGain: 0.06, heatGain: 0, risky: false, req: { brawn: 80 } }, // 10 silver/tick
  { id: 'joker', name: 'The Joker', faction: 'commons', baseIncome: 1_000_000_000, standingGain: 0.06, heatGain: 0, risky: false, req: { luck: 33 } }, // 1 crown/tick
  { id: 'night', name: 'Woman of the Night', faction: 'shadow', baseIncome: 10_000_000_000_000, standingGain: 0.06, heatGain: 0.02, risky: false, req: { charm: 90, cunning: 90 } }, // 10 tritons/tick
];

export function jobById(id: string): MemberJob | undefined {
  return MEMBER_JOBS.find((j) => j.id === id);
}

/** A member will take a job only if the job's faction admits their alignment —
 *  the same path gates the player faces (§9). A Lawful Good friar won't thieve;
 *  a Chaotic brute can't do almswork. */
export function memberCanDo(member: Member, job: MemberJob): boolean {
  return factionById(job.faction).admits(member.alignment);
}

/** Whether the master's own attributes have unlocked this duty for assignment. */
export function jobUnlocked(run: RunState, job: MemberJob): boolean {
  if (!job.req) return true;
  return (Object.keys(job.req) as AttrKey[]).every((k) => run.attrs[k] >= (job.req![k] ?? 0));
}

/** A duty's pay scales with the master's rank and the wretch's own skill. */
export function incomeOf(member: Member, job: MemberJob, rank: number): number {
  return job.baseIncome * (0.5 + rank / 100) * (0.5 + member.skill / 1000);
}

// ── Recruitment ─────────────────────────────────────────────────────────────

interface Archetype {
  id: string;
  name: string;
  ethicsBias: number;
  moralsBias: number;
}

const ARCHETYPES: Archetype[] = [
  { id: 'cutpurse', name: 'Cutpurse', ethicsBias: -30, moralsBias: -10 },
  { id: 'brute', name: 'Brute', ethicsBias: -15, moralsBias: -35 },
  { id: 'friar', name: 'Friar', ethicsBias: 45, moralsBias: 35 },
  { id: 'factor', name: 'Factor', ethicsBias: 12, moralsBias: -5 },
  { id: 'tough', name: 'Tough', ethicsBias: -10, moralsBias: -12 },
  { id: 'waif', name: 'Waif', ethicsBias: 0, moralsBias: 12 },
];

const FIRST_NAMES = ['Wat', 'Sil', 'Gunn', 'Tam', 'Hodge', 'Aldith', 'Osgar', 'Mabel', 'Piers', 'Cob', 'Edred', 'Wilf', 'Hick', 'Joan', 'Godwin', 'Nell', 'Bald', 'Sela', 'Roun', 'Alys'];
const BYNAMES = ['the Nimble', 'the Grim', 'One-Eye', 'the Quiet', 'Blackhand', 'the Lean', 'Coldwater', 'the Pious', 'Sly', 'the Bastard', 'Gallows-bait', 'the Fat', 'Redhand', 'the Younger'];

function clampAxis(v: number): number {
  return Math.max(-100, Math.min(100, v));
}

function genName(run: RunState): string {
  const first = FIRST_NAMES[nextInt(run, 0, FIRST_NAMES.length - 1)];
  if (nextFloat(run) < 0.6) {
    return `${first} ${BYNAMES[nextInt(run, 0, BYNAMES.length - 1)]}`;
  }
  return first;
}

function generateRecruit(run: RunState): Member {
  const id = `m${run.rngCursor}`;
  const arch = ARCHETYPES[nextInt(run, 0, ARCHETYPES.length - 1)];
  // candidates grow keener with the master's rank — skill ≈ rank × 10, reaching
  // 1000 at rank 100 — with a random 5–25 overlap so the tiers blur together.
  const spread = nextInt(run, 5, 25);
  const skill = Math.max(1, run.rank * 10 + nextInt(run, -spread, spread));
  const alignment = {
    ethics: clampAxis(arch.ethicsBias + nextInt(run, -22, 22)),
    morals: clampAxis(arch.moralsBias + nextInt(run, -22, 22)),
  };
  const upkeep = Math.round((0.05 + skill * 0.008) * 100) / 100;
  return { id, name: genName(run), archetype: arch.name, skill, alignment, job: null, upkeep, heat: 0 };
}

/** Cost to hire a candidate — richer skill, steeper fee. */
export function hireCost(member: Member): number {
  return 20 + member.skill * 6;
}

/** Keep the candidate pool full while the Guild is unlocked. */
export function ensureRecruits(run: RunState): void {
  if (run.rank < GUILD_MIN_RANK) return;
  while (run.recruits.length < RECRUIT_SLOTS) {
    run.recruits.push(generateRecruit(run));
  }
}

export function rerollRecruits(run: RunState): boolean {
  if (run.rank < GUILD_MIN_RANK || run.coin < REROLL_COST) return false;
  run.coin -= REROLL_COST;
  run.recruits = [];
  ensureRecruits(run);
  return true;
}

export function hireRecruit(run: RunState, id: string): boolean {
  if (run.members.length >= maxMembers(run.rank)) return false;
  const idx = run.recruits.findIndex((r) => r.id === id);
  if (idx < 0) return false;
  const recruit = run.recruits[idx];
  if (run.coin < hireCost(recruit)) return false;
  run.coin -= hireCost(recruit);
  run.recruits.splice(idx, 1);
  run.members.push(recruit);
  return true;
}

export function dismissMember(run: RunState, id: string): boolean {
  const idx = run.members.findIndex((m) => m.id === id);
  if (idx < 0) return false;
  run.members.splice(idx, 1);
  return true;
}

export function assignMemberJob(run: RunState, memberId: string, jobId: string | null): boolean {
  const member = run.members.find((m) => m.id === memberId);
  if (!member) return false;
  if (jobId === null) {
    member.job = null;
    return true;
  }
  const job = jobById(jobId);
  if (!job || !memberCanDo(member, job) || !jobUnlocked(run, job)) return false;
  member.job = jobId;
  return true;
}

export function totalUpkeep(run: RunState): number {
  return run.members.reduce((s, m) => s + m.upkeep, 0);
}

// ── Per-tick processing ───────────────────────────────────────────────────────

/** Run the whole Guild for one tick: earnings, standing, wages, and risk. */
export function processGuild(game: GameState, run: RunState): void {
  if (run.rank < GUILD_MIN_RANK && run.members.length === 0) return;

  // earnings, standing, member heat, skill growth
  for (const m of run.members) {
    if (!m.job) continue;
    const job = jobById(m.job);
    if (!job || !memberCanDo(m, job) || !jobUnlocked(run, job)) {
      m.job = null; // alignment drifted out, or the duty is no longer unlocked
      continue;
    }
    run.coin += incomeOf(m, job, run.rank);
    run.factions[job.faction] = Math.min(100, run.factions[job.faction] + job.standingGain);
    if (job.heatGain > 0) m.heat = Math.min(100, m.heat + job.heatGain);
    m.skill = Math.min(1000, m.skill + 0.015);
  }

  // wages — unpaid members grumble but stay sworn to the Guild; only their own
  // Heat reaching a boil (or the player's hand) ever forces one out.
  const wages = totalUpkeep(run);
  if (wages > 0) {
    if (run.coin >= wages) {
      run.coin -= wages;
      run.guildUnpaidTicks = 0;
    } else {
      run.coin = 0;
      run.guildUnpaidTicks++;
    }
  }

  // A sworn member is only lost when their own Heat boils over to 100 — then the
  // watch takes them and the Guild is exposed a little more. Nothing else forces
  // a member out; only the player's hand (dismiss) does otherwise.
  for (const m of [...run.members]) {
    if (m.heat >= 100) {
      dismissMember(run, m.id);
      run.heat = Math.min(100, run.heat + 8);
      pushLog(run, `${m.name}, too hot to hide, is seized by the watch — the Guild is exposed a little more.`, 'bad');
    }
  }

  ensureRecruits(run);
}
