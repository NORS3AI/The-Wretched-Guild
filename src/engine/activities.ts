// The idle layer (§7). Assign one, and time carries it. Each completed cycle
// yields, then the activity repeats until the player changes it.

import type { AttrKey, RunState } from './types';
import { nextInt, nextFloat, chance } from './rng';
import { pushLog, trainAttr, raiseAttr, gainStanding } from './helpers';
import { maxHp } from './survival';
import { addItem, ITEMS, MAX_POUCHES, syncCapacity } from './items';
import { ownedLevel, workMultiplier, BUSINESSES, type BusinessDef } from './businesses';
import { TICKS_PER_DAY } from './timeconst';
import { churchOpen, illicitPrime } from './time';
import { driftBearing, shiftAlignment } from './alignment';
import { gainSkill, skillLevel } from './skills';

/** A find dropped by work: try to pocket it, and say so. */
function stallDrop(run: RunState, id: string): void {
  if (addItem(run, id, 1)) {
    pushLog(run, `You come away with a ${ITEMS[id].name.toLowerCase()} — into your pocket it goes.`, 'good');
  } else {
    pushLog(run, `You come by a ${ITEMS[id].name.toLowerCase()}, but have nowhere to put it.`, 'plain');
  }
}

/** Shared payout for the three Hard Labour activities: 3–5 copper, a nudge
 *  toward Lawful, Commons standing, and the odd burst of Brawn. */
function labourEarn(run: RunState): void {
  const coin = nextInt(run, 3, 5);
  run.coin += coin;
  gainStanding(run, 'commons', 0.5);
  driftBearing(run, 1, 0); // honest toil nudges you toward Lawful
  if (chance(run, 0.1)) raiseAttr(run, 'brawn', 0.1, 0.4); // 10% → +0.1–0.4 Brawn
  pushLog(run, `A day's hard labour earns you ${coin} copper.`, 'coin');
}

export interface ActivityDef {
  id: string;
  name: string;
  path: string;
  blurb: string;
  ticks: number;
  /** trains this attribute a little each cycle */
  trains: AttrKey | null;
  /** run one completed cycle; returns a short log line (or null for silence) */
  complete: (run: RunState) => void;
}

export const ACTIVITIES: ActivityDef[] = [
  {
    id: 'beg',
    name: 'Beg in the Square',
    path: 'Commons',
    blurb: 'A copper from the pitying and the pious — but begging is a crime, and the watch is watching.',
    ticks: 6, // 12 seconds at 1×
    trains: 'charm',
    complete(run) {
      gainStanding(run, 'commons', 0.15);
      if (chance(run, 0.05)) raiseAttr(run, 'charm', 0.1, 0.3); // 5% → +0.1–0.3 Charm
      const roll = nextFloat(run);
      if (roll < 0.9) {
        run.coin += 1;
        pushLog(run, 'A passer-by drops a copper into your palm.', 'coin');
      } else if (roll < 0.98) {
        pushLog(run, 'You are cursed at and given nothing.', 'plain');
      } else {
        // 2% caught — then a scramble to get away
        if (chance(run, 0.45)) {
          pushLog(run, 'A bailiff lunges for you — you twist free and vanish into the crowd!', 'bad');
        } else {
          run.stocksUntil = run.tick + TICKS_PER_DAY; // one day
          run.activity = null;
          pushLog(run, 'The watch seizes you for vagrancy and claps you in the stocks for a day.', 'bad');
        }
      }
    },
  },
  {
    id: 'fell_timber',
    name: 'Fell Timber',
    path: 'Hard Labour',
    blurb: 'Swing an axe in the lord\'s wood. 3–5 copper, and now and then a good log to sell.',
    ticks: 8,
    trains: 'brawn',
    complete(run) {
      labourEarn(run);
      if (chance(run, 0.1)) stallDrop(run, 'wooden_log');
    },
  },
  {
    id: 'coal_mine',
    name: 'Work the Coal Mines',
    path: 'Hard Labour',
    blurb: 'Hew at the black seam underground. 3–5 copper, and a chance at coal or iron ore.',
    ticks: 8,
    trains: 'brawn',
    complete(run) {
      labourEarn(run);
      if (chance(run, 0.1)) stallDrop(run, 'coal');
      if (chance(run, 0.1)) stallDrop(run, 'iron_ore');
    },
  },
  {
    id: 'till_fields',
    name: 'Till the Fields',
    path: 'Hard Labour',
    blurb: 'Break the earth behind the plough. 3–5 copper, and a chance at seed or a stray potato.',
    ticks: 8,
    trains: 'brawn',
    complete(run) {
      labourEarn(run);
      if (chance(run, 0.1)) stallDrop(run, 'wheat_seeds');
      if (chance(run, 0.1)) stallDrop(run, 'potato');
    },
  },
  {
    id: 'pickpocket',
    name: 'Pick Pockets',
    path: 'Shadow',
    blurb: 'Quick coin from careless purses — but every lift raises your Heat. Safest worked in the dead of night (2–5 am).',
    ticks: 5,
    trains: 'stealth',
    complete(run) {
      trainAttr(run, 'stealth');
      // caught? scales with heat, mitigated by stealth — and the dead of night
      // (2–5 am) halves the risk, when honest folk and the watch are abed.
      let caughtP = Math.max(0.05, 0.18 + run.heat / 400 - run.attrs.stealth / 120);
      if (illicitPrime(run)) caughtP *= 0.5;
      if (chance(run, caughtP)) {
        run.heat = Math.min(100, run.heat + nextInt(run, 4, 8));
        run.hp = Math.max(0, run.hp - 1); // a beating — engine checks for death
        pushLog(run, 'A mark seizes your wrist — you wrench free, bruised and marked.', 'bad');
      } else {
        const coin = nextInt(run, 1, 5);
        run.coin += coin;
        run.heat = Math.min(100, run.heat + 1);
        driftBearing(run, -1, 0); // thieving pulls you toward Chaos
        gainStanding(run, 'shadow', 0.4);
        if (chance(run, 0.1)) raiseAttr(run, 'luck', 0.05, 0.1); // 10% on a lift → +Luck
        pushLog(run, `You lift ${coin} copper from an unguarded purse.`, 'coin');
      }
    },
  },
  {
    id: 'pray',
    name: 'Serve at the Chapel',
    path: 'Church',
    blurb: 'Sweep the nave, tend the poor, learn your letters. Builds Piety and Church standing — but the Chaotic are turned away.',
    ticks: 7,
    trains: 'piety',
    complete(run) {
      // the chapel doors are barred outside its hours (6 am – 9 pm)
      if (!churchOpen(run)) {
        pushLog(run, 'The chapel is dark and locked for the night. You wait in the cold.', 'plain');
        return;
      }
      trainAttr(run, 'piety');
      const gained = gainStanding(run, 'church', 0.5);
      if (gained > 0) {
        // tending the poor sometimes moves you toward Good (not Lawful)
        if (chance(run, 0.3)) {
          shiftAlignment(run, 0, 0.2 + nextFloat(run) * 0.2);
        }
        const alms = nextInt(run, 0, 1);
        run.coin += alms;
        pushLog(run, 'You serve at the chapel; the priest marks your devotion.', 'plain');
      } else {
        // alignment gate in action — a Chaotic soul earns nothing here.
        pushLog(run, 'You kneel, but the words ring hollow. The Church has no place for one so wild of spirit.', 'bad');
      }
    },
  },
  {
    id: 'forage',
    name: 'Forage & Gather Herbs',
    path: 'Commons',
    blurb: 'Comb the hedgerows for roots and herbs. The keener your Foraging skill, the more you find.',
    ticks: 7,
    trains: 'wits',
    complete(run) {
      trainAttr(run, 'wits');
      gainStanding(run, 'commons', 0.15);
      // Foraging skill is the difference between finding something and nothing:
      // 45% at skill 0 rising to ~90% at 100.
      const findChance = 0.45 + (skillLevel(run, 'foraging') / 100) * 0.45;
      if (chance(run, findChance)) {
        gainSkill(run, 'foraging', 1); // a find teaches the eye
        const got = chance(run, 0.5) ? 'herbs' : 'roots';
        if (addItem(run, got, 1)) pushLog(run, `You gather ${ITEMS[got].name.toLowerCase()} from the hedge.`, 'good');
        else pushLog(run, 'Your pockets are too full to carry more.', 'plain');
      } else {
        pushLog(run, 'You search the hedgerows but find nothing of use.', 'plain');
      }
    },
  },
  {
    id: 'fish',
    name: 'Fish the Shallows',
    path: 'Commons',
    blurb: 'Patient work at the water\'s edge for a raw fish. Fishing skill rises by 1 for every two you land.',
    ticks: 8,
    trains: 'wits',
    complete(run) {
      trainAttr(run, 'wits');
      gainStanding(run, 'commons', 0.2);
      if (chance(run, 0.55)) {
        gainSkill(run, 'fishing', 0.5); // +1 skill per two fish landed
        if (addItem(run, 'fish', 1)) pushLog(run, 'You pull a fish from the shallows.', 'good');
        else {
          run.coin += ITEMS['fish'].value;
          pushLog(run, `No room for the fish, so you sell it for ${ITEMS['fish'].value} copper.`, 'coin');
        }
      } else {
        pushLog(run, 'The fish are not biting today.', 'plain');
      }
    },
  },
  {
    id: 'scavenge',
    name: 'Scavenge for Salvage',
    path: 'Commons',
    blurb: 'Pick through middens and ruins for anything worth a coin. Builds Brawn.',
    ticks: 6,
    trains: 'brawn',
    complete(run) {
      trainAttr(run, 'brawn', 0.12);
      if (chance(run, 0.6)) {
        const id = chance(run, 0.5) ? 'scrap' : 'firewood';
        if (addItem(run, id, 1)) pushLog(run, `You salvage a ${ITEMS[id].name.toLowerCase()}.`, 'good');
        else {
          run.coin += ITEMS[id].value;
          pushLog(run, `Pockets full — you sell your find for ${ITEMS[id].value} copper.`, 'coin');
        }
      } else {
        pushLog(run, 'You dig through refuse and find only filth.', 'plain');
      }
    },
  },
  {
    id: 'laylow',
    name: 'Lay Low',
    path: 'Any',
    blurb: 'Vanish into the crowd. Heat cools, wounds close, no coin earned.',
    ticks: 6,
    trains: null,
    complete(run) {
      run.heat = Math.max(0, run.heat - nextInt(run, 6, 10));
      run.hp = Math.min(maxHp(run), run.hp + 1);
      // stop laying low once there is nothing left to recover from
      if (run.hp >= maxHp(run) && run.heat <= 0) {
        run.activity = null;
        pushLog(run, 'Wounds knit and the hue and cry has died down — no need to hide any longer. You stop laying low.', 'good');
      } else {
        pushLog(run, 'You keep to the shadows and let the city forget your face.', 'plain');
      }
    },
  },
];

// ── Working your enterprises ──────────────────────────────────────────────────
// Every owned enterprise can be WORKED for coin, scaled by the same ownership
// multiplier as the market stall (×2 at L1, ×2.5 at L2, …). These aren't listed
// under "Ply Your Trade" — they live in the Enterprises panel, and only an
// enterprise you actually own can be worked.

export const WORK_PREFIX = 'work_';

function makeWorkActivity(def: BusinessDef): ActivityDef {
  return {
    id: WORK_PREFIX + def.id,
    name: `${def.workVerb} the ${def.name}`,
    path: 'Enterprise',
    blurb: `Put in a shift at your ${def.name}. Yield scales with its level (×2, ×2.5, ×3 …).`,
    ticks: 7,
    trains: def.workTrains,
    complete(run) {
      const lvl = ownedLevel(run, def.id);
      if (lvl < 1) return; // you can only work what you own
      const mult = workMultiplier(lvl);
      const base = nextInt(run, def.workYield[0], def.workYield[1]);
      const coin = Math.round(base * mult);
      run.coin += coin;
      trainAttr(run, def.workTrains);
      gainStanding(run, def.faction, 0.5);
      pushLog(run, `A shift at the ${def.name} turns ${coin} copper (×${mult.toFixed(1)}).`, 'coin');

      // the market stall draws better wares as it grows (see the drop table).
      if (def.id === 'market_stall') marketStallDrops(run, lvl);
    },
  };
}

/** The market stall's level-gated finds while it is worked. */
function marketStallDrops(run: RunState, lvl: number): void {
  if (lvl >= 3 && chance(run, 0.2)) stallDrop(run, 'pastry');
  if (lvl >= 7 && chance(run, 0.3)) stallDrop(run, 'cake');
  if (lvl >= 15 && chance(run, 0.4)) stallDrop(run, 'fried_fish');
  if (lvl >= 30) {
    if (chance(run, 0.2)) stallDrop(run, 'chicken_curry');
    if (chance(run, 0.2)) stallDrop(run, 'health_potion');
    if (chance(run, 0.05)) {
      if ((run.pouches ?? 0) < MAX_POUCHES) {
        run.pouches = (run.pouches ?? 0) + 1;
        syncCapacity(run);
        pushLog(run, 'You find a fine leather pouch and clip it to your belt (+2 slots).', 'good');
      } else {
        run.coin += 30;
        pushLog(run, 'You find a pouch, but your belt is full — you sell it for 30 copper.', 'coin');
      }
    }
  }
}

/** A work-activity for each enterprise, keyed `work_<businessId>`. */
export const WORK_ACTIVITIES: ActivityDef[] = BUSINESSES.map(makeWorkActivity);

export function activityById(id: string): ActivityDef | undefined {
  return ACTIVITIES.find((a) => a.id === id) ?? WORK_ACTIVITIES.find((a) => a.id === id);
}
