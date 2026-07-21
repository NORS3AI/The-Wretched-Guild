// Household & Servants (§14). Once you have truly risen (rank 50), you stop
// doing everything yourself. Servant groups unlock as you climb, each taking a
// chore off your hands — cooking, feeding, bathing, chamber pots, and finally
// running your enterprises and trades. They draw wages; leave them unpaid and
// they desert you. A Chaotic-Evil master keeps SLAVES and a Lawful-Good one
// keeps DISCIPLES — both toil 2.2× as hard and cost nothing.

import type { GameState, RunState } from './types';
import { ethicsBand, moralsBand } from './alignment';
import { countItem, removeItem, addItem, hasRoom } from './items';
import { bestRawGame, GAME_ROAST } from './deeds';
import { BUSINESSES, ownedLevel, workCoinPerTick, type BusinessDef } from './businesses';
import { pushLog } from './helpers';

export interface ServantGroup {
  id: string;
  name: string;
  reqRank: number;
  wage: number; // coin/tick when paid (0 when free, for slaves/disciples)
  blurb: string;
}

export const SERVANT_GROUPS: ServantGroup[] = [
  { id: 'kitchen', name: 'Kitchen Servants', reqRank: 50, wage: 0.4, blurb: 'Cook your river fish and roast your hunted game the moment you bring it in.' },
  { id: 'steward', name: 'Table Stewards', reqRank: 60, wage: 0.8, blurb: 'Feed and water you the instant either need falls to half (51%).' },
  { id: 'bath', name: 'Bath Servants', reqRank: 70, wage: 0.8, blurb: 'Draw hot water and bathe you at half hygiene (51%).' },
  { id: 'chamber', name: 'Chamber Servants', reqRank: 80, wage: 0.8, blurb: 'Change your chamber pots, relieving you at half (51%).' },
  { id: 'foreman1', name: 'Head Foreman', reqRank: 90, wage: 3, blurb: 'Runs your single most advanced enterprise forever — freeing you to work another venture or a trade.' },
  { id: 'foreman2', name: 'Second Foreman', reqRank: 95, wage: 5, blurb: 'Runs your second most advanced enterprise the very same way.' },
  { id: 'labourers', name: 'Trade Labourers', reqRank: 100, wage: 8, blurb: 'Work three of your Ply-Your-Trade tasks alongside whatever you are doing.' },
];

export function servantById(id: string): ServantGroup | undefined {
  return SERVANT_GROUPS.find((s) => s.id === id);
}

/** A Chaotic-Evil master or a Lawful-Good one keeps free, harder-driven servants. */
export function servantsFree(run: RunState): boolean {
  const e = ethicsBand(run.alignment);
  const m = moralsBand(run.alignment);
  return (e === 'Chaotic' && m === 'Evil') || (e === 'Lawful' && m === 'Good');
}

/** Slaves and disciples toil 2.2× as hard. */
export function servantMultiplier(run: RunState): number {
  return servantsFree(run) ? 2.2 : 1;
}

/** What the household is called for the current bearing. */
export function servantWord(run: RunState): 'slaves' | 'disciples' | 'servants' {
  const e = ethicsBand(run.alignment);
  const m = moralsBand(run.alignment);
  if (e === 'Chaotic' && m === 'Evil') return 'slaves';
  if (e === 'Lawful' && m === 'Good') return 'disciples';
  return 'servants';
}

export function servantWage(run: RunState, group: ServantGroup): number {
  return servantsFree(run) ? 0 : group.wage;
}

export function isServantHired(run: RunState, id: string): boolean {
  return !!run.servants?.[id];
}

/** Total wage per tick across the whole hired household (0 for slaves/disciples). */
export function totalServantWage(run: RunState): number {
  if (servantsFree(run)) return 0;
  return SERVANT_GROUPS.reduce((s, g) => s + (run.servants?.[g.id] ? g.wage : 0), 0);
}

export function canHireServant(run: RunState, group: ServantGroup): boolean {
  return run.rank >= group.reqRank && !isServantHired(run, group.id);
}

export function hireServant(run: RunState, id: string): boolean {
  const g = servantById(id);
  if (!g || run.rank < g.reqRank || isServantHired(run, id)) return false;
  // older saves can reach here with servants never initialised — guard so hiring
  // your first servant can never crash the game.
  if (!run.servants) run.servants = {};
  run.servants[id] = true;
  return true;
}

export function dismissServant(run: RunState, id: string): boolean {
  if (!run.servants) run.servants = {};
  if (!run.servants[id]) return false;
  run.servants[id] = false;
  return true;
}

/** Owned businesses, most advanced first (highest level, then priciest). */
export function advancedBusinesses(run: RunState): { def: BusinessDef; level: number }[] {
  return BUSINESSES.map((def) => ({ def, level: ownedLevel(run, def.id) }))
    .filter((b) => b.level > 0)
    .sort((a, b) => b.level - a.level || b.def.baseCost - a.def.baseCost);
}

const LABOURER_TRADE_COIN = 3; // avg coin/tick per trade a labourer works

/** Run the whole household for one tick: wages, chores, and the working staff. */
export function processServants(game: GameState, run: RunState): void {
  if (!run.servants) return;
  const anyHired = SERVANT_GROUPS.some((g) => run.servants[g.id]);
  if (!anyHired) return;

  // wages — unless they're free (slaves/disciples). Unpaid, they desert at once.
  const wage = totalServantWage(run);
  if (wage > 0) {
    if (run.coin >= wage) {
      run.coin -= wage;
    } else {
      for (const g of SERVANT_GROUPS) run.servants[g.id] = false;
      pushLog(run, 'Your servants, their wages unpaid, gather their things and desert you.', 'bad');
      return;
    }
  }

  const mult = servantMultiplier(run);

  // Kitchen: cook one raw catch per tick — skilled hands, no oil needed.
  if (run.servants.kitchen) {
    if (countItem(run, 'fish') >= 1 && hasRoom(run, 'cooked_fish')) {
      removeItem(run, 'fish', 1);
      addItem(run, 'cooked_fish', 1);
    } else {
      const raw = bestRawGame(run);
      if (raw && hasRoom(run, GAME_ROAST[raw])) {
        removeItem(run, raw, 1);
        addItem(run, GAME_ROAST[raw], 1);
      }
    }
  }

  // Stewards, bath, chamber: keep the body's needs from ever falling past half.
  if (run.servants.steward) {
    if (run.needs.food <= 51) run.needs.food = 100;
    if (run.needs.water <= 51) run.needs.water = 100;
  }
  if (run.servants.bath && run.needs.hygiene <= 51) run.needs.hygiene = 100;
  if (run.servants.chamber && run.needs.relief <= 51) run.needs.relief = 100;

  // Foremen run your top ventures forever, as though you worked them yourself.
  if (run.servants.foreman1 || run.servants.foreman2) {
    const top = advancedBusinesses(run);
    if (run.servants.foreman1 && top[0]) run.coin += workCoinPerTick(top[0].def, top[0].level) * mult;
    if (run.servants.foreman2 && top[1]) run.coin += workCoinPerTick(top[1].def, top[1].level) * mult;
  }

  // Labourers ply three trades at once.
  if (run.servants.labourers) run.coin += 3 * LABOURER_TRADE_COIN * mult;

  if (run.coin > run.peakCoin) run.peakCoin = run.coin;
}
