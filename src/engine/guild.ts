// The Guild (§12) — the doer→director turn. Recruit wretches, each with their
// own alignment that gates what work they'll take, assign them to jobs that run
// in parallel, and manage their wages and mortality.

import type { GameState, Member, RunState } from './types';
import type { FactionId } from './factions';
import { factionById } from './factions';
import { nextInt, nextFloat, chance } from './rng';
import { pushLog } from './helpers';

export const GUILD_MIN_RANK = 3; // no one follows a nobody
export const RECRUIT_SLOTS = 3;
export const REROLL_COST = 5;
const UNPAID_GRACE = 240; // ~10 in-game days of missed wages before someone walks

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
  baseIncome: number; // coin/tick, before skill scaling
  standingGain: number; // guild faction standing/tick
  heatGain: number; // added to the member's own heat/tick
  risky: boolean;
}

export const MEMBER_JOBS: MemberJob[] = [
  { id: 'scavenge', name: 'Scavenge & Beg', faction: 'commons', baseIncome: 0.06, standingGain: 0.02, heatGain: 0, risky: false },
  { id: 'labour', name: 'Honest Labour', faction: 'commons', baseIncome: 0.12, standingGain: 0.03, heatGain: 0, risky: false },
  { id: 'trade', name: 'Market Trade', faction: 'merchants', baseIncome: 0.16, standingGain: 0.04, heatGain: 0.005, risky: false },
  { id: 'alms', name: 'Church Almswork', faction: 'church', baseIncome: 0.1, standingGain: 0.05, heatGain: 0, risky: false },
  { id: 'thieve', name: 'Thieving', faction: 'shadow', baseIncome: 0.22, standingGain: 0.04, heatGain: 0.03, risky: true },
  { id: 'collect', name: 'Collect Debts', faction: 'shadow', baseIncome: 0.3, standingGain: 0.05, heatGain: 0.06, risky: true },
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

export function incomeOf(member: Member, job: MemberJob): number {
  return job.baseIncome * (0.5 + member.skill / 20);
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
  const skill = nextInt(run, 3, 9) + nextInt(run, 0, Math.min(12, run.rank));
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
  if (!job || !memberCanDo(member, job)) return false;
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
    if (!job || !memberCanDo(m, job)) {
      m.job = null; // alignment drifted out of eligibility (defensive)
      continue;
    }
    run.coin += incomeOf(m, job);
    run.factions[job.faction] = Math.min(100, run.factions[job.faction] + job.standingGain);
    if (job.heatGain > 0) m.heat = Math.min(100, m.heat + job.heatGain);
    m.skill = Math.min(40, m.skill + 0.015);
  }

  // wages
  const wages = totalUpkeep(run);
  if (wages > 0) {
    if (run.coin >= wages) {
      run.coin -= wages;
      run.guildUnpaidTicks = 0;
    } else {
      run.coin = 0;
      run.guildUnpaidTicks++;
      if (run.guildUnpaidTicks > UNPAID_GRACE && run.members.length > 0) {
        // the priciest wretch, unpaid, walks
        const quitter = run.members.reduce((a, b) => (b.upkeep > a.upkeep ? b : a));
        dismissMember(run, quitter.id);
        run.guildUnpaidTicks = 0;
        pushLog(run, `${quitter.name}, unpaid too long, abandons the Guild.`, 'bad');
      }
    }
  }

  // risk: members on dirty work can be taken by the watch
  for (const m of [...run.members]) {
    const job = m.job ? jobById(m.job) : null;
    if (!job || !job.risky) continue;
    const p = 0.0004 + m.heat / 9000;
    if (chance(run, p)) {
      dismissMember(run, m.id);
      run.heat = Math.min(100, run.heat + 8);
      pushLog(run, `${m.name} is seized by the watch mid-job — the Guild is exposed a little more.`, 'bad');
    }
  }

  ensureRecruits(run);
}
