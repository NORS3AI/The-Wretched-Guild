// The engine core: a single tick advance and a command dispatcher. The UI never
// mutates state directly — it dispatches Commands and the engine reduces them.

import type { GameState, RunState } from './types';
import { activityById } from './activities';
import { ENCOUNTERS } from './encounters';
import { newRun } from './state';
import { CONTRACT_COOLDOWN } from './state';
import { die, commitToMeta } from './death';
import { bindLog, pushLog } from './helpers';
import { nextFloat } from './rng';
import { META_UNLOCKS } from './unlocks';
import { canJoinShadow } from './alignment';
import { advancement, rankTitle } from './ranks';
import { processBusinesses, invest, BUSINESSES, ownedLevel } from './businesses';
import { chance, nextInt } from './rng';

export const TICKS_PER_DAY = 24;
export const DAYS_PER_YEAR = 12;
export const TICKS_PER_YEAR = TICKS_PER_DAY * DAYS_PER_YEAR;

export function currentDay(run: RunState): number {
  return Math.floor(run.tick / TICKS_PER_DAY) + 1;
}

// ── Tick ──────────────────────────────────────────────────────────────────────

/** Advance in-game time by one tick. Mutates game in place. Time does NOT flow
 *  while an encounter is open or the character is dead — the caller guards that. */
export function advanceTick(game: GameState): void {
  const run = game.run;
  if (!run.alive || run.encounter) return;
  bindLog(game);

  run.tick++;

  // aging & mortality
  const newAge = 16 + Math.floor(run.tick / TICKS_PER_YEAR);
  if (newAge > run.ageYears) {
    const years = newAge - run.ageYears;
    run.ageYears = newAge;
    for (let i = 0; i < years; i++) {
      if (rollMortality(game, run)) return;
    }
  }

  // owned ventures earn passively (§11)
  processBusinesses(run);

  // idle activity
  if (run.activity) {
    const def = activityById(run.activity.id);
    if (def) {
      run.activity.progress++;
      if (run.activity.progress >= def.ticks) {
        run.activity.progress = 0;
        def.complete(run);
        if (run.health <= 0 && run.alive) {
          die(game, run, 'dead of your wounds');
          return;
        }
      }
    }
  }

  // the law answers accumulated notoriety (§10)
  if (lawEnforcement(game, run)) return;

  // contract offers
  if (!run.contractAvailable) {
    run.contractCooldown--;
    if (run.contractCooldown <= 0) {
      run.contractAvailable = true;
      pushLog(run, 'A hooded factor of the Shadow Guild is asking for you. There is work.', 'system');
    }
  }
}

/** High Heat draws the watch. They fine you, cool your notoriety, and — if your
 *  affairs are dirty — smash a venture. Returns true only if it proves lethal. */
function lawEnforcement(game: GameState, run: RunState): boolean {
  if (run.heat < 75) return false;
  const p = (run.heat - 75) / 480; // ~0 at 75, ~0.05 at 100
  if (!chance(run, p)) return false;

  // knock down a random illicit venture, if any
  const dirty = BUSINESSES.filter((b) => b.illicit && ownedLevel(run, b.id) > 0);
  if (dirty.length && chance(run, 0.5)) {
    const target = dirty[nextInt(run, 0, dirty.length - 1)];
    run.businesses[target.id] = ownedLevel(run, target.id) - 1;
    run.heat = Math.max(0, run.heat - 35);
    pushLog(run, `The watch raids your ${target.name}. It is broken up and you scatter into the night.`, 'bad');
    return false;
  }

  const fine = Math.min(Math.max(0, run.coin), 12 + Math.floor(run.heat));
  run.coin -= fine;
  run.heat = Math.max(0, run.heat - 30);
  run.health -= nextInt(run, 0, 6);
  if (run.health <= 0) {
    die(game, run, 'beaten to death by the watch');
    return true;
  }
  pushLog(run, `The watch corners you — ${fine} coin buys your freedom, and a few bruises.`, 'bad');
  return false;
}

/** Yearly mortality roll: illness always looms; old age makes it a certainty.
 *  Returns true if the character died this year. */
function rollMortality(game: GameState, run: RunState): boolean {
  const age = run.ageYears;
  const oldAge = Math.max(0, (age - 40) / 130); // 0 at 40, ~0.38 at 90
  const illness = 0.012;
  if (nextFloat(run) < illness + oldAge) {
    const cause = age >= 55 ? 'taken by old age' : 'carried off by a winter fever';
    die(game, run, cause);
    return true;
  }
  return false;
}

// ── Commands ──────────────────────────────────────────────────────────────────

export type Command =
  | { type: 'setActivity'; id: string | null }
  | { type: 'acceptContract' }
  | { type: 'chooseEncounter'; index: number }
  | { type: 'seekAdvancement' }
  | { type: 'investBusiness'; id: string }
  | { type: 'beginNewLife' }
  | { type: 'buyUnlock'; id: string };

export function dispatch(game: GameState, cmd: Command): void {
  bindLog(game);
  const run = game.run;

  switch (cmd.type) {
    case 'setActivity': {
      if (!run.alive) break;
      run.activity = cmd.id ? { id: cmd.id, progress: 0 } : null;
      break;
    }

    case 'acceptContract': {
      if (!run.alive || !run.contractAvailable || run.encounter) break;
      // the Shadow Guild's path gate (§9): the Lawful Good are turned away.
      if (!canJoinShadow(run.alignment)) {
        pushLog(run, 'The factor studies your honest face, spits, and melts away. The Guild has no use for a saint.', 'bad');
        run.contractAvailable = false;
        run.contractCooldown = CONTRACT_COOLDOWN;
        break;
      }
      const def = ENCOUNTERS['contract_taxman'];
      run.encounter = { defId: def.id, nodeId: def.start, lastOutcomeText: def.intro };
      run.contractAvailable = false;
      break;
    }

    case 'seekAdvancement': {
      if (!run.alive) break;
      const adv = advancement(run);
      if (!adv.eligible || adv.nextRank === null) break;
      run.rank = adv.nextRank;
      pushLog(run, `You rise in the world. You are now a ${rankTitle(run)} (rank ${run.rank}).`, 'good');
      break;
    }

    case 'investBusiness': {
      if (!run.alive) break;
      const def = BUSINESSES.find((b) => b.id === cmd.id);
      if (!def) break;
      const level = ownedLevel(run, def.id);
      if (invest(run, cmd.id)) {
        const verb = level === 0 ? 'acquire' : 'expand';
        pushLog(run, `You ${verb} the ${def.name} (level ${run.businesses[def.id]}).`, 'good');
      }
      break;
    }

    case 'chooseEncounter': {
      if (!run.encounter) break;
      const def = ENCOUNTERS[run.encounter.defId];
      const node = def.nodes[run.encounter.nodeId];
      const choice = node.choices[cmd.index];
      if (!choice) break;
      if (choice.gate && !choice.gate(run)) break; // ineligible — ignore

      const outcome = choice.resolve(game, run);

      if (!run.alive) {
        // the choice killed us (e.g. a botched escape)
        run.encounter = null;
        break;
      }
      if (outcome.next) {
        run.encounter = {
          defId: def.id,
          nodeId: outcome.next,
          lastOutcomeText: outcome.text,
        };
      } else {
        // encounter over
        run.encounter = null;
        run.contractCooldown = CONTRACT_COOLDOWN;
        pushLog(run, outcome.text, 'plain');
      }
      break;
    }

    case 'beginNewLife': {
      if (run.alive) break;
      commitToMeta(game);
      game.run = newRun(game.meta);
      pushLog(game.run, 'A new wretch takes up the Guild\'s cause, born into the same cold mud.', 'system');
      break;
    }

    case 'buyUnlock': {
      const def = META_UNLOCKS.find((u) => u.id === cmd.id);
      if (!def) break;
      if (game.meta.unlocks[def.id]) break;
      if (game.meta.legacy < def.cost) break;
      game.meta.legacy -= def.cost;
      game.meta.unlocks[def.id] = true;
      break;
    }
  }
}
