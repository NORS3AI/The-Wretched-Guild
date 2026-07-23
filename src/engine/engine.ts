// The engine core: a single tick advance and a command dispatcher. The UI never
// mutates state directly — it dispatches Commands and the engine reduces them.

import type { GameState, RunState } from './types';
import { activityById } from './activities';
import { ENCOUNTERS } from './encounters';
import { CONTRACTS, pickContractTarget, contractById, wasSpared, contractPay } from './contracts';
import { formatMoney } from './money';
import { newRun } from './state';
import { CONTRACT_COOLDOWN } from './state';
import { die } from './death';
import { bindLog, pushLog } from './helpers';
import { nextFloat } from './rng';
import { META_UNLOCKS, unlockCost } from './unlocks';
import { canJoinShadow, neutralize } from './alignment';
import { advancement, completeAdvance, devAdvance } from './ranks';
import { processBusinesses, invest, BUSINESSES, ownedLevel } from './businesses';
import { processGuild, ensureRecruits, hireRecruit, dismissMember, assignMemberJob, rerollRecruits } from './guild';
import { processServants, hireServant, dismissServant } from './servants';
import { tickSurvival, heal } from './survival';
import { deedById } from './deeds';
import { itemDef, isEdible, removeItem, addItem, hasRoom, countItem, VENDOR_STOCK } from './items';
import { chance, nextInt } from './rng';
import { shopOpen } from './time';
import { buyCarryUpgrade, buyGear, merchantSoldOut, type CarryKind, type GearKind } from './merchant';
import { MERCHANT_COOLDOWN, EVENT_COOLDOWN_MIN, EVENT_COOLDOWN_MAX } from './state';
import { pickEvent } from './events';

export { TICKS_PER_DAY, DAYS_PER_YEAR, TICKS_PER_YEAR } from './timeconst';
import { TICKS_PER_DAY, TICKS_PER_YEAR } from './timeconst';

export function currentDay(run: RunState): number {
  return Math.floor(run.tick / TICKS_PER_DAY) + 1;
}

// ── Tick ──────────────────────────────────────────────────────────────────────

/** Advance in-game time by one tick. Mutates game in place. Time flows even while
 *  an encounter is open (the player can leave it) — only death stops the clock. */
export function advanceTick(game: GameState): void {
  const run = game.run;
  if (!run.alive) return;
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

  // the household of servants tends chores and runs your ventures (§14)
  processServants(game, run);

  // idle activity (suspended while imprisoned)
  if (run.activity && run.stocksUntil === null) {
    const def = activityById(run.activity.id);
    if (def) {
      run.activity.progress++;
      // dev "fast cards": every Ply-Your-Trade and enterprise-work cycle finishes
      // in a single tick instead of its full duration.
      const need = game.settings?.fastCards ? 1 : def.ticks;
      if (run.activity.progress >= need) {
        run.activity.progress = 0;
        def.complete(run);
        // Honest, ordinary work — Hard Labour and the Commons trades — pulls the
        // bearing back toward True Neutral on both axes, never past centre.
        if (def.path === 'Hard Labour' || def.path === 'Commons') neutralize(run, 0.3);
        if (run.hp <= 0 && run.alive) {
          die(game, run, 'dead of your wounds');
          return;
        }
      }
    }
  }

  // crafting runs in PARALLEL to the trade/enterprise activity above — it is
  // something MORE you do, not instead. Its own slot advances the same way.
  if (run.craftActivity && run.stocksUntil === null) {
    const def = activityById(run.craftActivity.id);
    if (def) {
      run.craftActivity.progress++;
      const need = game.settings?.fastCards ? 1 : def.ticks;
      if (run.craftActivity.progress >= need) {
        run.craftActivity.progress = 0;
        const once = run.craftActivity.once === true; // capture before complete may null it
        def.complete(run); // a craft's complete() nulls run.craftActivity when out of stock
        // "Craft 1": stop after this single completed cycle (if it didn't already stop)
        if (once && run.craftActivity) run.craftActivity = null;
      }
    }
  }

  // dev "no heat": keep the player (and their Guild) forever cool
  if (game.settings?.noHeat) {
    run.heat = 0;
    for (const m of run.members) m.heat = 0;
  }

  // the law answers accumulated notoriety (§10)
  if (lawEnforcement(game, run)) return;

  // contract offers — a fresh mark is drawn from the roster (the killed are gone
  // for good; the spared may come round again).
  if (!run.contractAvailable) {
    run.contractCooldown--;
    if (run.contractCooldown <= 0) {
      const target = pickContractTarget(run);
      if (target) {
        run.contractAvailable = true;
        run.contractTargetId = target.id;
        run.contractsOffered = (run.contractsOffered ?? 0) + 1;
        pushLog(run, 'A hooded factor of the Shadow Guild is asking for you. There is work.', 'system');
      } else {
        // no living marks left to offer — try again later
        run.contractCooldown = CONTRACT_COOLDOWN;
      }
    }
  }

  // a wandering merchant rolls into town now and then (arriving by daylight) and
  // stays until the player waves them off (see the dismissMerchant command).
  if (!run.merchantHere && !merchantSoldOut(run)) {
    run.merchantCooldown--;
    if (run.merchantCooldown <= 0 && shopOpen(run)) {
      run.merchantHere = true;
      run.merchantCooldown = MERCHANT_COOLDOWN;
      pushLog(run, 'A wandering merchant rolls into the square with pouches, packs, and beasts of burden for sale.', 'system');
    }
  }

  // random town events spring up now and then — a harvest to help, a chapel bell,
  // an unguarded stall, a dropped purse. A one-choice encounter that pauses time.
  if (run.encounter === null && run.stocksUntil === null) {
    run.eventCooldown--;
    if (run.eventCooldown <= 0) {
      const ev = pickEvent(run);
      run.encounter = { defId: ev.id, nodeId: ev.start, lastOutcomeText: ev.intro };
      run.eventCooldown = nextInt(run, EVENT_COOLDOWN_MIN, EVENT_COOLDOWN_MAX);
    }
  }

  // the Crafting bench opens the first time you hold coal and iron ore together
  // (2 coal + 1 ore) — and stays open for the rest of the life once earned.
  if (!run.craftingUnlocked && countItem(run, 'coal') >= 2 && countItem(run, 'iron_ore') >= 1) {
    run.craftingUnlocked = true;
    pushLog(run, 'Coal and iron ore in hand, you see how they might be smelted and worked. A Crafting bench opens to you — begin at the Lumberyard.', 'system');
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
  | { type: 'setCraftActivity'; id: string | null; once?: boolean }
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
  | { type: 'eatItem'; id: string }
  | { type: 'sellItem'; id: string }
  | { type: 'sellAllItem'; id: string }
  | { type: 'beginNewLife' }
  | { type: 'buyUnlock'; id: string }
  | { type: 'buyItem'; id: string }
  | { type: 'buyCarry'; kind: CarryKind }
  | { type: 'buyGear'; kind: GearKind }
  | { type: 'dismissMerchant' }
  | { type: 'declineContract' }
  | { type: 'dismissEncounter' }
  | { type: 'devRankUp' }
  | { type: 'devResetRank' }
  | { type: 'hireServant'; id: string }
  | { type: 'dismissServant'; id: string }
  | { type: 'setLabourerTrade'; slot: number; id: string | null }
  | { type: 'setForemanEnterprise'; foremanId: string; businessId: string | null }
  | { type: 'toggleWorn'; id: string };

export function dispatch(game: GameState, cmd: Command): void {
  bindLog(game);
  const run = game.run;

  switch (cmd.type) {
    case 'setActivity': {
      if (!run.alive || run.stocksUntil !== null) break;
      const id = cmd.id;
      if (id) {
        // crafts live in their own parallel slot — never the trade slot
        if (id.startsWith('craft_')) break;
        if (id.startsWith('work_')) {
          // you can only work an enterprise you actually own
          if (ownedLevel(run, id.slice(5)) < 1) break;
        } else {
          // trades gate by coin thresholds and gear (see each activity's available)
          const def = activityById(id);
          if (def?.available && !def.available(run)) break;
        }
      }
      run.activity = id ? { id, progress: 0 } : null;
      break;
    }

    case 'setCraftActivity': {
      if (!run.alive || run.stocksUntil !== null) break;
      const id = cmd.id;
      if (id) {
        const def = activityById(id);
        if (!def || !id.startsWith('craft_')) break;
        if (def.available && !def.available(run)) break; // bench open + stock in hand
      }
      run.craftActivity = id ? { id, progress: 0, once: !!cmd.once } : null;
      break;
    }

    case 'payStocks': {
      if (run.stocksUntil === null || run.coin < 50) break;
      run.coin -= 50;
      run.stocksUntil = null;
      pushLog(run, 'You press 50 copper into a gaoler\'s waiting palm and are quietly let go, spared the worst of it.', 'plain');
      break;
    }

    case 'declineContract': {
      if (!run.contractAvailable) break;
      run.contractAvailable = false;
      run.contractTargetId = null;
      run.contractCooldown = CONTRACT_COOLDOWN;
      pushLog(run, 'You wave the factor off. The Shadow Guild will come knocking again.', 'plain');
      break;
    }

    case 'dismissEncounter': {
      // only random events may simply be walked away from; contracts and rites
      // have their own exits within the encounter.
      if (!run.encounter || !run.encounter.defId.startsWith('event_')) break;
      run.encounter = null;
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
      const targetId = run.contractTargetId ?? 'contract_taxman';
      const def = CONTRACTS[targetId] ?? CONTRACTS['contract_taxman'];
      const target = contractById(def.id);
      // the fee scales with rank — fill it into the offer's intro
      const fee = target ? contractPay(target, run.rank) : 40;
      let intro = def.intro.replace('{FEE}', formatMoney(fee));
      // a mark spared before is offered again with a knowing nod to the fact.
      if (target && wasSpared(run, def.id)) {
        intro = `${target.name} still draws breath, and still deserves the knife. The Guild wants the job finished this time. ${intro}`;
      }
      run.encounter = { defId: def.id, nodeId: def.start, lastOutcomeText: intro };
      break;
    }

    case 'seekAdvancement': {
      if (!run.alive || run.encounter) break;
      // dev "Free advancement" treats all numeric requirements as met, so the
      // real Seek Advancement flow (Rites included) can be tested cost-free.
      const free = !!game.settings?.freeAdvance;
      const adv = advancement(run, free);
      if (!adv.eligible || adv.nextRank === null) break;
      // crossing into a new band demands a Rite of Passage (§13)
      if (adv.milestone && !adv.milestonePassed) {
        const rite = ENCOUNTERS[adv.milestone];
        if (rite) {
          run.encounter = { defId: rite.id, nodeId: rite.start, lastOutcomeText: rite.intro };
        }
        break;
      }
      // free advancement rises with no cost; otherwise spend the coin + standing
      if (free) devAdvance(run);
      else completeAdvance(run);
      break;
    }

    case 'devRankUp': {
      if (!run.alive) break;
      devAdvance(run); // free rise, auto-passing any Rite of Passage
      break;
    }

    case 'devResetRank': {
      run.rank = 1;
      run.milestones = {};
      pushLog(run, 'By some dark whim of the Guild, you are cast back to rank 1 — a Beggar once more.', 'system');
      break;
    }

    case 'hireServant': {
      if (!run.alive) break;
      hireServant(run, cmd.id);
      break;
    }

    case 'dismissServant': {
      if (!run.alive) break;
      dismissServant(run, cmd.id);
      break;
    }

    case 'setLabourerTrade': {
      if (!run.alive) break;
      if (!Array.isArray(run.labourerTrades)) run.labourerTrades = [null, null, null];
      if (cmd.slot < 0 || cmd.slot >= run.labourerTrades.length) break;
      // a trade can only be worked in one slot — clear it from any other
      if (cmd.id) {
        for (let i = 0; i < run.labourerTrades.length; i++) {
          if (i !== cmd.slot && run.labourerTrades[i] === cmd.id) run.labourerTrades[i] = null;
        }
      }
      run.labourerTrades[cmd.slot] = cmd.id;
      break;
    }

    case 'toggleWorn': {
      if (!run.alive) break;
      const def = itemDef(cmd.id);
      if (!def?.wearable) break;
      if (!run.worn) run.worn = {};
      if (run.worn[cmd.id]) {
        // take it off — it returns from your body to the pockets (needs room)
        if (!hasRoom(run, cmd.id)) {
          pushLog(run, `You have no room to stow the ${def.name.toLowerCase()} — clear a pocket first.`, 'plain');
          break;
        }
        run.worn[cmd.id] = false;
        addItem(run, cmd.id, 1);
      } else {
        // put it on — it leaves the pockets and rides on your body
        if (countItem(run, cmd.id) < 1) break; // must own it to wear it
        removeItem(run, cmd.id, 1);
        run.worn[cmd.id] = true;
      }
      break;
    }

    case 'setForemanEnterprise': {
      if (!run.alive) break;
      if (!run.foremanEnterprises || typeof run.foremanEnterprises !== 'object') run.foremanEnterprises = {};
      // one enterprise per foreman — assigning it to one clears it from the other
      if (cmd.businessId) {
        for (const fid of Object.keys(run.foremanEnterprises)) {
          if (fid !== cmd.foremanId && run.foremanEnterprises[fid] === cmd.businessId) {
            run.foremanEnterprises[fid] = null;
          }
        }
      }
      run.foremanEnterprises[cmd.foremanId] = cmd.businessId;
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
      // Deeds may be done even with an event pending — you can still drink,
      // relieve yourself, seek warmth, and so on while an encounter waits on the
      // Events tab. Only the stocks (imprisonment) or death stop you.
      if (!run.alive || run.stocksUntil !== null) break;
      const deed = deedById(cmd.id);
      if (!deed) break;
      if (deed.available && !deed.available(run)) break;
      // the deed consumes time — needs decay while it happens. A deed doesn't
      // touch the open encounter; but if a NEW encounter springs up mid-deed
      // (only possible when none was open to begin with), it aborts the deed.
      const startEncounter = run.encounter;
      for (let i = 0; i < deed.timeTicks; i++) {
        advanceTick(game);
        if (!run.alive) break;
        if (run.encounter && run.encounter !== startEncounter) break;
      }
      if (run.alive) deed.effect(game, run);
      break;
    }

    case 'eatItem': {
      if (!run.alive || run.stocksUntil !== null) break;
      const def = itemDef(cmd.id);
      if (!def || !isEdible(def)) break;
      if (!removeItem(run, cmd.id, 1)) break;
      if (def.food) run.needs.food = Math.min(100, run.needs.food + def.food);
      if (def.water) run.needs.water = Math.min(100, run.needs.water + def.water);
      if (def.heal) heal(run, def.heal);
      pushLog(run, `You eat a ${def.name.toLowerCase()}.`, 'good');
      break;
    }

    case 'sellItem': {
      if (!run.alive) break;
      const def = itemDef(cmd.id);
      if (!def) break;
      if (!removeItem(run, cmd.id, 1)) break;
      run.coin += def.value;
      pushLog(run, `The pedlar buys your ${def.name.toLowerCase()} for ${def.value} copper.`, 'coin');
      break;
    }

    case 'sellAllItem': {
      if (!run.alive) break;
      const def = itemDef(cmd.id);
      if (!def) break;
      const n = countItem(run, cmd.id);
      if (n <= 0 || !removeItem(run, cmd.id, n)) break;
      run.coin += def.value * n;
      pushLog(run, `The pedlar buys all ${n} of your ${def.name.toLowerCase()} for ${def.value * n} copper.`, 'coin');
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

    case 'buyItem': {
      if (!run.alive || run.stocksUntil !== null) break;
      if (!VENDOR_STOCK.includes(cmd.id)) break;
      const def = itemDef(cmd.id);
      if (!def || def.buy == null) break;
      if (!shopOpen(run)) {
        pushLog(run, 'The vendor\'s shutters are down — the shop is open only from 8 in the morning to 5 in the evening.', 'plain');
        break;
      }
      if (run.coin < def.buy) {
        pushLog(run, `You cannot spare the ${def.buy} copper for a ${def.name.toLowerCase()}.`, 'plain');
        break;
      }
      if (!hasRoom(run, cmd.id)) {
        pushLog(run, 'Your pockets are too full to carry it.', 'plain');
        break;
      }
      run.coin -= def.buy;
      addItem(run, cmd.id, 1);
      pushLog(run, `You buy a ${def.name.toLowerCase()} for ${def.buy} copper.`, 'coin');
      break;
    }

    case 'buyCarry': {
      if (!run.alive) break;
      if (!run.merchantHere) break; // the merchant has moved on
      buyCarryUpgrade(run, cmd.kind);
      break;
    }

    case 'buyGear': {
      if (!run.alive) break;
      if (!run.merchantHere) break;
      buyGear(run, cmd.kind);
      break;
    }

    case 'dismissMerchant': {
      if (!run.merchantHere) break;
      run.merchantHere = false;
      run.merchantCooldown = MERCHANT_COOLDOWN; // they'll wander back another day
      pushLog(run, 'The wandering merchant packs up and rolls on to the next town.', 'plain');
      break;
    }

    case 'beginNewLife': {
      if (run.alive) break;
      // spoils were already banked at death; just count the finished life and
      // seed the next one (meta unlocks bought on the death screen shape it).
      game.meta.runsCompleted += 1;
      game.run = newRun(game.meta);
      // a new life is a clean page — wipe the old wretch's Chronicle
      game.log.length = 0;
      // begin paused so the player can settle in before time flows
      game.paused = true;
      pushLog(game.run, 'A new wretch takes up the Guild\'s cause, born into the same cold mud. (Paused — press Resume when ready.)', 'system');
      break;
    }

    case 'buyUnlock': {
      const def = META_UNLOCKS.find((u) => u.id === cmd.id);
      if (!def) break;
      const level = game.meta.unlocks[def.id] ?? 0;
      const cost = unlockCost(def, level); // levels are infinite
      if (def.currency === 'tokens') {
        if (game.meta.tokens < cost) break;
        game.meta.tokens = Math.round((game.meta.tokens - cost) * 4) / 4;
      } else {
        if (game.meta.legacy < cost) break;
        game.meta.legacy -= cost;
      }
      game.meta.unlocks[def.id] = level + 1;
      break;
    }
  }
}
