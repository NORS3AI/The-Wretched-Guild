// The idle layer (§7). Assign one, and time carries it. Each completed cycle
// yields, then the activity repeats until the player changes it.

import type { AttrKey, RunState } from './types';
import { nextInt, nextFloat, chance } from './rng';
import { pushLog, trainAttr, gainStanding } from './helpers';
import { maxHp } from './survival';
import { addItem, ITEMS } from './items';
import { TICKS_PER_DAY } from './timeconst';
import { driftBearing } from './alignment';
import { gainSkill } from './skills';

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
      trainAttr(run, 'charm', 0.12);
      gainStanding(run, 'commons', 0.15);
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
    id: 'labor',
    name: 'Honest Labour',
    path: 'Commons',
    blurb: 'Fish, fell timber, work the fields. Slow, steady, and lawful.',
    ticks: 8,
    trains: 'brawn',
    complete(run) {
      const coin = nextInt(run, 2, 4);
      run.coin += coin;
      trainAttr(run, 'brawn');
      gainStanding(run, 'commons', 0.5);
      driftBearing(run, 1, 0); // honest toil nudges you toward Lawful
      pushLog(run, `A day's labour earns you ${coin} copper.`, 'coin');
    },
  },
  {
    id: 'pickpocket',
    name: 'Pick Pockets',
    path: 'Shadow',
    blurb: 'Quick coin from careless purses — but every lift raises your Heat.',
    ticks: 5,
    trains: 'stealth',
    complete(run) {
      trainAttr(run, 'stealth', 0.2);
      // caught? scales with heat, mitigated by stealth.
      const caughtP = Math.max(0.05, 0.18 + run.heat / 400 - run.attrs.stealth / 120);
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
      trainAttr(run, 'piety', 0.2);
      driftBearing(run, 1, 0);
      const gained = gainStanding(run, 'church', 0.5);
      if (gained > 0) {
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
    id: 'trade',
    name: 'Work a Market Stall',
    path: 'Merchants',
    blurb: 'Buy low, sell dear, haggle all day. Steady coin and standing with the Merchant Guilds.',
    ticks: 7,
    trains: 'wits',
    complete(run) {
      const coin = nextInt(run, 1, 4);
      run.coin += coin;
      trainAttr(run, 'wits', 0.2);
      gainStanding(run, 'merchants', 0.5);
      pushLog(run, `A day at the stall turns ${coin} coin of profit.`, 'coin');
    },
  },
  {
    id: 'forage',
    name: 'Forage & Gather Herbs',
    path: 'Commons',
    blurb: 'Comb the hedgerows for roots and healing herbs. Sharpens the eye (Wits).',
    ticks: 7,
    trains: 'wits',
    complete(run) {
      trainAttr(run, 'wits');
      gainSkill(run, 'foraging', 0.12);
      gainStanding(run, 'commons', 0.15);
      const got = chance(run, 0.5) ? 'herbs' : 'roots';
      if (chance(run, 0.7)) {
        if (addItem(run, got, 1)) pushLog(run, `You gather ${ITEMS[got].name.toLowerCase()} from the hedge.`, 'good');
        else pushLog(run, 'Your pockets are too full to carry more.', 'plain');
      } else {
        pushLog(run, 'You search the hedgerows but find little of use.', 'plain');
      }
    },
  },
  {
    id: 'fish',
    name: 'Fish the Shallows',
    path: 'Commons',
    blurb: 'Patient work at the water\'s edge for a meal or coin. Builds Wits.',
    ticks: 8,
    trains: 'wits',
    complete(run) {
      trainAttr(run, 'wits');
      gainSkill(run, 'fishing', 0.15);
      gainStanding(run, 'commons', 0.2);
      if (chance(run, 0.55)) {
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

export function activityById(id: string): ActivityDef | undefined {
  return ACTIVITIES.find((a) => a.id === id);
}
