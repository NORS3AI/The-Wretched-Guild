// The idle layer (§7). Assign one, and time carries it. Each completed cycle
// yields, then the activity repeats until the player changes it.

import type { AttrKey, RunState } from './types';
import { nextInt, nextFloat, chance } from './rng';
import { pushLog, trainAttr, raiseAttr, gainStanding } from './helpers';
import { maxHp } from './survival';
import { addItem, ITEMS, MAX_POUCHES, syncCapacity, hasIronSpike, guardShielded } from './items';
import { CRAFT_ACTIVITIES } from './crafting';
import { ownedLevel, ownsAnyBusiness, workMultiplier, WORK_TICKS, BUSINESSES, type BusinessDef } from './businesses';
import { TICKS_PER_DAY } from './timeconst';
import { churchOpen, illicitPrime } from './time';
import { driftBearing, shiftAlignment } from './alignment';
import { gainSkill, skillLevel } from './skills';

/** A find dropped by work: try to pocket it, and say so. */
function stallDrop(run: RunState, id: string): void {
  if (addItem(run, id, 1)) {
    pushLog(run, `You come away with a ${ITEMS[id].name.toLowerCase()} — and stow it away.`, 'good');
  } else {
    pushLog(run, `You come by a ${ITEMS[id].name.toLowerCase()}, but have nowhere to put it.`, 'plain');
  }
}

/** Shared payout for the Hard Labour activities: a coin range, a nudge toward
 *  Lawful, Commons standing, and the odd burst of Brawn. Each labour sets its
 *  own pay (Fell Timber 3–5, Coal Mines 7–10, Fields 12–17). */
function labourEarn(run: RunState, lo = 3, hi = 5): void {
  const coin = nextInt(run, lo, hi);
  run.coin += coin;
  gainStanding(run, 'commons', 0.5);
  // Honest toil has no moral or political colour — the pull back toward True
  // Neutral is applied centrally for every Hard Labour / Commons cycle (see
  // advanceTick), so nothing is nudged toward Lawful here.
  if (chance(run, 0.1)) raiseAttr(run, 'brawn', 0.1, 0.4); // 10% → +0.1–0.4 Brawn
  pushLog(run, `A day's hard labour earns you ${coin} copper.`, 'coin');
}

export interface ActivityDef {
  id: string;
  name: string;
  path: string;
  blurb: string;
  ticks: number;
  /** trains this attribute a little each cycle (never shown to the player —
   *  what builds Brawn, Wits, Charm, etc. is for them to discover) */
  trains: AttrKey | null;
  /** the copper a cycle pays, shown as a tag (e.g. "3–5c"). Omit for activities
   *  that yield goods or nothing rather than coin. */
  earns?: string;
  /** whether this trade is open to the player right now (coin thresholds, gear).
   *  Omitted → always available. */
  available?: (run: RunState) => boolean;
  /** run one completed cycle; returns a short log line (or null for silence) */
  complete: (run: RunState) => void;
}

export const ACTIVITIES: ActivityDef[] = [
  {
    id: 'beg',
    name: 'Beg in the Square',
    path: 'Commons',
    blurb: 'A copper from the pitying and the pious — but begging is a crime, and the watch is watching.',
    ticks: 6,
    trains: 'charm',
    earns: '≈1c',
    available: (run) => run.coin < 40 && !ownsAnyBusiness(run), // 40 copper (or an enterprise) puts begging behind you
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
        // 2% caught — then a scramble to get away (or the Weatherman turns them)
        if (chance(run, 0.45) || guardShielded(run)) {
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
    blurb: 'Swing an axe in the lord\'s wood — and now and then a good log to sell.',
    ticks: 8,
    trains: 'brawn',
    earns: '3–5c',
    available: (run) => run.coin >= 40,
    complete(run) {
      labourEarn(run);
      if (chance(run, 0.1)) stallDrop(run, 'wooden_log');
    },
  },
  {
    id: 'coal_mine',
    name: 'Work the Coal Mines',
    path: 'Hard Labour',
    blurb: 'Hew at the black seam underground — a chance at coal or iron ore.',
    ticks: 9, // 15% longer than felling timber
    trains: 'brawn',
    earns: '7–10c',
    available: (run) => run.coin >= 1000, // opens at 1 shilling
    complete(run) {
      labourEarn(run, 7, 10);
      if (chance(run, 0.1)) stallDrop(run, 'coal');
      if (chance(run, 0.1)) stallDrop(run, 'iron_ore');
    },
  },
  {
    id: 'till_fields',
    name: 'Till the Fields',
    path: 'Hard Labour',
    blurb: 'Break the earth behind the plough — a chance at seed or a stray potato.',
    ticks: 10, // 15% longer than the coal mines
    trains: 'brawn',
    earns: '12–17c',
    available: (run) => run.coin >= 2000, // opens at 2 shillings
    complete(run) {
      labourEarn(run, 12, 17);
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
    earns: '2–9c',
    complete(run) {
      trainAttr(run, 'stealth');
      // caught? scales with heat, mitigated by stealth — and the dead of night
      // (2–5 am) halves the risk, when honest folk and the watch are abed. The
      // Iron Spike dagger sharpens the hand: +10% Stealth in the reckoning and a
      // flat −10% chance of being caught (a +10% success rate).
      const spike = hasIronSpike(run);
      const effStealth = run.attrs.stealth + (spike ? 10 : 0);
      let caughtP = Math.max(0.05, 0.18 + run.heat / 400 - effStealth / 120);
      if (spike) caughtP = Math.max(0.03, caughtP - 0.1);
      if (illicitPrime(run)) caughtP *= 0.5;
      if (chance(run, caughtP)) {
        run.heat = Math.min(100, run.heat + nextInt(run, 4, 8));
        run.hp = Math.max(0, run.hp - 1); // a beating — engine checks for death
        run.pickpocketStrikes = (run.pickpocketStrikes ?? 0) + 1;
        // caught seven times over, the watch finally hauls you to the stocks —
        // unless the Weatherman shield turns the guard's hand (50%).
        if (run.pickpocketStrikes >= 7 && !guardShielded(run)) {
          run.pickpocketStrikes = 0;
          run.stocksUntil = run.tick + TICKS_PER_DAY;
          run.activity = null;
          pushLog(run, 'Caught cutting purses once too often, the watch drags you to the stocks for a day.', 'bad');
        } else if (run.pickpocketStrikes >= 7) {
          run.pickpocketStrikes = 0;
          pushLog(run, 'The watch lunges to haul you off — but the great shield on your back turns them, and you slip away.', 'good');
        } else {
          pushLog(run, `A mark seizes your wrist — you wrench free, bruised and marked (${run.pickpocketStrikes}/7 before the stocks).`, 'bad');
        }
      } else {
        let coin = nextInt(run, 2, 9);
        if (illicitPrime(run)) coin *= 5; // the dead of night pays five-fold
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
    blurb: 'Sweep the nave, tend the poor, learn your letters — but the Chaotic of spirit are turned away.',
    ticks: 7,
    trains: 'piety',
    earns: '3–7c',
    complete(run) {
      // the chapel doors are barred outside its hours (6 am – 9 pm)
      if (!churchOpen(run)) {
        pushLog(run, 'The chapel is dark and locked for the night. You wait in the cold.', 'plain');
        return;
      }
      trainAttr(run, 'piety');
      const gained = gainStanding(run, 'church', 0.5);
      if (gained > 0) {
        // service to the Church is service to Order — it pulls the bearing toward
        // Lawful (ethics), and never touches Good/Evil.
        shiftAlignment(run, 0.2 + nextFloat(run) * 0.2, 0);
        const alms = nextInt(run, 3, 7);
        run.coin += alms;
        pushLog(run, `You serve at the chapel; the priest presses ${alms} copper of alms into your hand and marks your devotion.`, 'coin');
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
    blurb: 'Comb the hedgerows for roots and herbs to fill your pockets.',
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
    blurb: 'Patient work at the water\'s edge for a raw fish to cook or sell.',
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
    id: 'hunt',
    name: 'Hunting',
    path: 'Commons',
    blurb: 'Stalk game in the wood with your bow. Rarer beasts are worth far more — roast them with oil to eat, or sell them whole.',
    ticks: 8,
    trains: 'stealth',
    earns: 'game',
    available: (run) => run.hasBow, // needs a bow from the wandering merchant
    complete(run) {
      gainStanding(run, 'commons', 0.15);
      if (!chance(run, 0.6)) {
        gainSkill(run, 'hunting', 0.15); // even a missed stalk teaches a little
        pushLog(run, 'The wood is still; the game eludes you.', 'plain');
        return;
      }
      gainSkill(run, 'hunting', 0.5);
      // a keener eye (higher Hunting) tips the roll toward rarer, richer quarry
      const r = nextFloat(run) - skillLevel(run, 'hunting') / 300;
      let id: string;
      if (r < 0.02) id = 'raw_elk';
      else if (r < 0.06) id = 'raw_deer';
      else if (r < 0.13) id = 'raw_goat';
      else if (r < 0.25) id = 'raw_sheep';
      else if (r < 0.43) id = 'raw_boar';
      else if (r < 0.68) id = 'raw_rabbit';
      else id = 'raw_weasel';
      if (addItem(run, id, 1)) pushLog(run, `You loose an arrow and bring down a ${ITEMS[id].name.toLowerCase()}.`, 'good');
      else {
        run.coin += ITEMS[id].value;
        pushLog(run, `No room for the ${ITEMS[id].name.toLowerCase()}, so you sell it whole for ${ITEMS[id].value} copper.`, 'coin');
      }
    },
  },
  {
    id: 'scavenge',
    name: 'Scavenge for Salvage',
    path: 'Commons',
    blurb: 'Pick through middens and ruins for anything worth a coin. A keener scavenger\'s eye finds more.',
    ticks: 6,
    trains: 'brawn',
    complete(run) {
      trainAttr(run, 'brawn', 0.12);
      // a trained Scavenging eye turns up salvage more often (60% → ~90%)
      const findChance = 0.6 + (skillLevel(run, 'scavenging') / 100) * 0.3;
      if (chance(run, findChance)) {
        gainSkill(run, 'scavenging', 0.5); // a good find teaches the eye
        const id = chance(run, 0.5) ? 'scrap' : 'firewood';
        if (addItem(run, id, 1)) pushLog(run, `You salvage a ${ITEMS[id].name.toLowerCase()}.`, 'good');
        else {
          run.coin += ITEMS[id].value;
          pushLog(run, `Pockets full — you sell your find for ${ITEMS[id].value} copper.`, 'coin');
        }
      } else {
        gainSkill(run, 'scavenging', 0.1); // even a fruitless dig teaches a little
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
      // your Guild members lie low with you — each cools 2 Heat of their own
      for (const m of run.members) {
        if (m.heat > 0) m.heat = Math.max(0, m.heat - 2);
      }
      // stop laying low only once there is nothing left to recover from: your
      // wounds are fully closed, your own Heat is out, AND every Guild member's
      // Heat has cooled to nothing too.
      const membersCool = run.members.every((m) => m.heat <= 0);
      if (run.hp >= maxHp(run) && run.heat <= 0 && membersCool) {
        run.activity = null;
        pushLog(run, 'Wounds knit, the hue and cry has died down, and every wretch is cool — no need to hide any longer. You stop laying low.', 'good');
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
    ticks: WORK_TICKS,
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
  // pastry starts at level 1 and grows: L1 10%, L2 15%, L3+ 20%
  const pastryChance = lvl >= 3 ? 0.2 : lvl === 2 ? 0.15 : lvl >= 1 ? 0.1 : 0;
  if (pastryChance > 0 && chance(run, pastryChance)) stallDrop(run, 'pastry');
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
  return (
    ACTIVITIES.find((a) => a.id === id) ??
    WORK_ACTIVITIES.find((a) => a.id === id) ??
    CRAFT_ACTIVITIES.find((a) => a.id === id)
  );
}
