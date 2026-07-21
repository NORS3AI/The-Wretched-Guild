// Skills, trained by *doing*. Each skill is a percentage (0–100) that expresses
// how good you are at the thing it governs. A skill you have never used sits at
// 0 and stays HIDDEN until you first do it — you discover you can cook, fish, or
// forage by trying. Cooking's percentage is the chance a dish comes out right.

import type { RunState } from './types';
import { nextFloat } from './rng';

export interface SkillDef {
  id: string;
  name: string;
  blurb: string;
}

export const SKILLS: SkillDef[] = [
  { id: 'fishing', name: 'Fishing', blurb: 'Pulling fish from the water. Rises by 1 for every two fish landed.' },
  { id: 'hunting', name: 'Hunting', blurb: 'Stalking game with a bow. The keener your eye, the rarer the quarry.' },
  { id: 'foraging', name: 'Foraging', blurb: 'Finding roots and herbs in the wild. Higher skill, more finds.' },
  { id: 'scavenging', name: 'Scavenging', blurb: 'Picking salvage from middens and ruins. Higher skill, more finds.' },
  { id: 'firemaking', name: 'Firemaking', blurb: 'Coaxing a campfire from firewood.' },
  { id: 'cooking', name: 'Cooking', blurb: 'Frying raw catch into a meal. Your skill % is the chance it comes out right; the rest burns or fails.' },
  // ── Crafting skills (§ the Crafting tab). Trained by crafting at each bench. ──
  { id: 'lumberyard', name: 'Lumberyard', blurb: 'Sawing oak into boards and joining fine furniture.' },
  { id: 'smithing', name: 'Smithing', blurb: 'Smelting iron and forging tools, fittings, and arms.' },
  { id: 'farming', name: 'Farming', blurb: 'Threshing grain and baking it into bread and pies.' },
  { id: 'leatherworking', name: 'Leatherworking', blurb: 'Tanning hides and stitching leather goods.' },
];

export const SKILL_MAX = 100;

export function emptySkills(): Record<string, number> {
  const s: Record<string, number> = {};
  for (const sk of SKILLS) s[sk.id] = 0; // undiscovered until first used
  return s;
}

export function skillLevel(run: RunState, id: string): number {
  return run.skills[id] ?? 0;
}

/** A skill is "discovered" (and shown to the player) once they have used it. */
export function isDiscovered(run: RunState, id: string): boolean {
  return (run.skills[id] ?? 0) > 0;
}

/** Train a skill by a small amount, capped at 100. */
export function gainSkill(run: RunState, id: string, amount: number): void {
  run.skills[id] = Math.min(SKILL_MAX, (run.skills[id] ?? 0) + amount);
}

export type CookResult = 'cooked' | 'burnt' | 'failed';

/** How likely a cook burns, by skill %. Holds at 60% until 30, then steps down
 *  to 50 (@30), 25 (@50), 10 (@80), and 0 (@100 — burning becomes impossible). */
function burnChance(skill: number): number {
  if (skill >= 100) return 0;
  if (skill >= 80) return 0.1;
  if (skill >= 50) return 0.25;
  if (skill >= 30) return 0.5;
  return 0.6;
}

/** The base success floor: even at skill 0 there is a 0.5% chance a dish comes
 *  out right, so no skill is ever a hard soft-lock. */
export const SKILL_FLOOR = 0.005;

/** Roll a cooking attempt. Success chance is the skill % itself (floored at
 *  0.5% so skill 0 can still, rarely, succeed); the burn chance follows the
 *  curve above; whatever probability is left is a flat failure (you can't
 *  manage the dish and keep your ingredients). At skill 0 that's 0.5% cooked /
 *  60% burnt / 39.5% failed; at 50 it's 50 / 25 / 25; at 100, always cooked. */
export function cookRoll(run: RunState, id = 'cooking'): CookResult {
  const s = Math.max(0, Math.min(100, skillLevel(run, id)));
  const successP = Math.max(SKILL_FLOOR, s / 100);
  const burnP = Math.min(burnChance(s), 1 - successP);
  const r = nextFloat(run);
  if (r < successP) return 'cooked';
  if (r < successP + burnP) return 'burnt';
  return 'failed';
}
