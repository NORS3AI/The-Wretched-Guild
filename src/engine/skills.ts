// Skills (RuneScape-flavoured): trained by *doing*, all at once, alongside
// everything else. Levels rise slowly with use.

import type { RunState } from './types';

export interface SkillDef {
  id: string;
  name: string;
  blurb: string;
}

export const SKILLS: SkillDef[] = [
  { id: 'fishing', name: 'Fishing', blurb: 'Pulling fish from the water. Rises as you fish.' },
  { id: 'foraging', name: 'Foraging', blurb: 'Finding roots and herbs in the wild.' },
  { id: 'firemaking', name: 'Firemaking', blurb: 'Coaxing a campfire from firewood.' },
  { id: 'cooking', name: 'Cooking', blurb: 'Turning raw catch into a healing meal.' },
];

export const SKILL_MAX = 99;

export function emptySkills(): Record<string, number> {
  const s: Record<string, number> = {};
  for (const sk of SKILLS) s[sk.id] = 1;
  return s;
}

export function skillLevel(run: RunState, id: string): number {
  return run.skills[id] ?? 1;
}

/** Train a skill by a small amount, capped at 99. */
export function gainSkill(run: RunState, id: string, amount: number): void {
  run.skills[id] = Math.min(SKILL_MAX, (run.skills[id] ?? 1) + amount);
}
