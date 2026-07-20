// The idle layer (§7). Assign one, and time carries it. Each completed cycle
// yields, then the activity repeats until the player changes it.

import type { AttrKey, RunState } from './types';
import { nextInt, chance } from './rng';
import { pushLog, trainAttr } from './helpers';

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
    blurb: 'A trickle of coin from the pitying and the pious. Builds Charm.',
    ticks: 6,
    trains: 'charm',
    complete(run) {
      const coin = nextInt(run, 0, 2);
      run.coin += coin;
      trainAttr(run, 'charm', 0.15);
      if (coin > 0) pushLog(run, `You beg a passer-by for ${coin} coin.`, 'coin');
      else pushLog(run, 'You are cursed at and given nothing.', 'plain');
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
      trainAttr(run, 'brawn', 0.2);
      // honest toil nudges you, faintly, toward Lawful.
      run.alignment.ethics = Math.min(100, run.alignment.ethics + 0.4);
      pushLog(run, `A day's labour earns you ${coin} coin.`, 'coin');
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
        run.health -= nextInt(run, 3, 9); // a beating
        pushLog(run, 'A mark seizes your wrist — you wrench free, bruised and marked.', 'bad');
      } else {
        const coin = nextInt(run, 1, 5);
        run.coin += coin;
        run.heat = Math.min(100, run.heat + 1);
        run.alignment.ethics = Math.max(-100, run.alignment.ethics - 0.3);
        pushLog(run, `You lift ${coin} coin from an unguarded purse.`, 'coin');
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
      run.health = Math.min(run.maxHealth, run.health + nextInt(run, 2, 5));
      pushLog(run, 'You keep to the shadows and let the city forget your face.', 'plain');
    },
  },
];

export function activityById(id: string): ActivityDef | undefined {
  return ACTIVITIES.find((a) => a.id === id);
}
