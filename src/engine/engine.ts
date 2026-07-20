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
import { advancement, completeAdvance } from './ranks';
import { processBusinesses, invest, BUSINESSES, ownedLevel } from './businesses';
import { processGuild, ensureRecruits, hireRecruit, dismissMember, assignMemberJob, rerollRecruits } from './guild';
import { tickSurvival } from './survival';
import { deedById } from './deeds';
import { chance, nextInt } from './rng';

export { TICKS_PER_DAY, DAYS_PER_YEAR, TICKS_PER_YEAR } from './timeconst';
import { TICKS_PER_DAY, TICKS_PER_YEAR } from './timeconst';

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

  // survival: hunger, thirst, cold, filth, and sickness (§ beggar phase)
  if (tickSurvival(game, run)) return;

  // release from the stocks once the day is served — a ruinous ordeal
  if (run.stocksUntil !== null && run.tick >= run.stocksUntil) {
    run.stocksUntil = null;
    run.needs.food = Math.min(run.needs.food, 12);
    run.needs.water = Math.min(run.needs.water, 8);
    run.needs.hygiene = Math.min(run.needs.hygiene, 5);
    run.needs.relief = 0;
    pushLog(run, 'You are let out of the stocks at last — filthy, starving, and half-dead of thirst.', 'bad');
  }

  // owned ventures earn passively (§11)
  processBusinesses(run);

  // the Guild works in parallel (§12)
  processGuild(game, run);

  // idle activity (suspended while imprisoned)
  if (run.activity && run.stocksUntil === null) {
    const def = activityById(run.activity.id);
    if (def) {
      run.activity.progress++;
      if (run.activity.progress >= def.ticks) {
        run.activity.progress = 0;
        def.complete(run);
        if (run.hp <= 0 && run.alive) {
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

  if (run.coin > run.peakCoin) run.peakCoin = run.coin;
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
  run.hp = Math.max(0, run.hp - nextInt(run, 0, 2));
  if (run.hp <= 0) {
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
  | { type: 'payStocks' }
  | { type: 'investBusiness'; id: string }
  | { type: 'recruitMember'; id: string }
  | { type: 'dismissMember'; id: string }
  | { type: 'assignMember'; memberId: string; jobId: string | null }
  | { type: 'rerollRecruits' }
  | { type: 'doDeed'; id: string }
  | { type: 'beginNewLife' }
  | { type: 'buyUnlock'; id: string };

export function dispatch(game: GameState, cmd: Command): void {
  bindLog(game);
  const run = game.run;

  switch (cmd.type) {
    case 'setActivity': {
      if (!run.alive || run.stocksUntil !== null) break;
      run.activity = cmd.id ? { id: cmd.id, progress: 0 } : null;
      break;
    }

    case 'payStocks': {
      if (run.stocksUntil === null || run.coin < 50) break;
      run.coin -= 50;
      run.stocksUntil = null;
      pushLog(run, 'You press 50 copper into a gaoler\'s waiting palm and are quietly let go, spared the worst of it.', 'plain');
      break;
    }

    case 'acceptContract': {
      if (!run.alive || !run.contractAvailable || run.encounter || run.stocksUntil !== null) break;
      // the Shadow Guild's path gate (§9): the Lawful Good are turned away.
      if (!canJoinShadow(run.alignment)) {
        pushLog(run, 'The factor studies your honest face, spits, and melts away. The Guild has no use for a saint.', 'bad');
        run.contractAvailable = false;
        run.contractCooldown = CONTRACT_COOLDOWN;
        break;
      }
      // Opening the offer does NOT consume it — the player can read it and slip
      // away to decide later (the offer stays as a scroll to return to). It is
      // only spent once they commit to an approach (see the contract's choices).
      const def = ENCOUNTERS['contract_taxman'];
      run.encounter = { defId: def.id, nodeId: def.start, lastOutcomeText: def.intro };
      break;
    }

    case 'seekAdvancement': {
      if (!run.alive || run.encounter) break;
      const adv = advancement(run);
      if (!adv.eligible || adv.nextRank === null) break;
      // crossing into a new band demands a Rite of Passage (§13)
      if (adv.milestone && !adv.milestonePassed) {
        const rite = ENCOUNTERS[adv.milestone];
        if (rite) {
          run.encounter = { defId: rite.id, nodeId: rite.start, lastOutcomeText: rite.intro };
        }
        break;
      }
      // completeAdvance spends the required coin + combined standing and logs
      completeAdvance(run);
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

    case 'recruitMember': {
      if (!run.alive) break;
      const recruit = run.recruits.find((r) => r.id === cmd.id);
      const name = recruit?.name;
      if (hireRecruit(run, cmd.id) && name) {
        pushLog(run, `${name} takes the Guild's coin and swears to its cause.`, 'good');
        ensureRecruits(run);
      }
      break;
    }

    case 'dismissMember': {
      if (!run.alive) break;
      const m = run.members.find((x) => x.id === cmd.id);
      if (m && dismissMember(run, cmd.id)) {
        pushLog(run, `${m.name} is cast out of the Guild.`, 'plain');
      }
      break;
    }

    case 'assignMember': {
      if (!run.alive) break;
      assignMemberJob(run, cmd.memberId, cmd.jobId);
      break;
    }

    case 'rerollRecruits': {
      if (!run.alive) break;
      rerollRecruits(run);
      break;
    }

    case 'doDeed': {
      if (!run.alive || run.encounter || run.stocksUntil !== null) break;
      const deed = deedById(cmd.id);
      if (!deed) break;
      if (deed.available && !deed.available(run)) break;
      // the deed consumes time — needs decay while it happens
      for (let i = 0; i < deed.timeTicks; i++) {
        advanceTick(game);
        if (!run.alive || run.encounter) break;
      }
      if (run.alive && !run.encounter) deed.effect(game, run);
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
        // encounter over. (Contract offer consumption + cooldown are handled by
        // the contract's committing choices, not here, so deferring keeps it.)
        run.encounter = null;
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
      if (def.currency === 'tokens') {
        if (game.meta.tokens < def.cost) break;
        game.meta.tokens = Math.round((game.meta.tokens - def.cost) * 4) / 4;
      } else {
        if (game.meta.legacy < def.cost) break;
        game.meta.legacy -= def.cost;
      }
      game.meta.unlocks[def.id] = true;
      break;
    }
  }
}
