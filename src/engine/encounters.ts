// The interactive layer (§8). An Encounter is a small data tree of
// nodes → choices → (gates, alignment weights, outcomes). Missions are chains.
//
// The Shadow Guild's contracts (a roster of marks built from Osric's original
// three-beat template) live in contracts.ts; the Rites of Passage live in
// milestones.ts. This module defines the shared shapes and gathers them all.

import type { GameState, RunState } from './types';

export interface EncChoice {
  label: string;
  /** short tag shown before the label, e.g. "[Stealth 6]" or "[Lawful]" */
  tag?: string;
  /** eligibility — an ineligible choice is shown greyed-out, never hidden */
  gate?: (run: RunState) => boolean;
  /** why it is locked, shown on hover/subtext when gated */
  gateHint?: string;
  /** resolve the choice; mutate state and return narration + the next node */
  resolve: (game: GameState, run: RunState) => EncOutcome;
}

export interface EncOutcome {
  text: string;
  /** id of the next node, or null to end the encounter */
  next: string | null;
}

export interface EncNode {
  id: string;
  text: string;
  choices: EncChoice[];
}

export interface EncounterDef {
  id: string;
  title: string;
  intro: string;
  start: string;
  nodes: Record<string, EncNode>;
}

import { CONTRACTS } from './contracts';
import { MILESTONES } from './milestones';

export const ENCOUNTERS: Record<string, EncounterDef> = {
  ...CONTRACTS,
  ...MILESTONES,
};
