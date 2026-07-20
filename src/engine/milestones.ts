// Rites of Passage (§13). Crossing into each new band of the rank ladder is not
// a button click but a lived choice — an RPG-dialogue Encounter where you decide
// *how* you rise, shaping your alignment and sometimes your faction standing.
// Numeric requirements are already met when a rite opens (see engine.ts); the
// rite is the human moment on top of the numbers.

import type { EncounterDef, EncOutcome } from './encounters';
import type { RunState } from './types';
import { completeAdvance } from './ranks';
import { shiftAlignment, ethicsBand, moralsBand } from './alignment';
import { pushLog } from './helpers';
import { riskRoll } from './checks';

/** Standard "you rise" ending: advance the rank and close the encounter. */
function rise(run: RunState, milestoneId: string, text: string): EncOutcome {
  completeAdvance(run, milestoneId);
  return { text, next: null };
}

/** "Not yet" ending: close without advancing; the rite can be retried. */
function withdraw(run: RunState, text: string): EncOutcome {
  pushLog(run, 'You hold back, unready. The moment passes — for now.', 'plain');
  return { text, next: null };
}

const crossroads: EncounterDef = {
  id: 'rite_crossroads',
  title: 'The Beggar\'s Crossroads',
  intro: 'You have coin in your purse and the gutter behind you. By a dying fire an old vagabond studies your face. "You\'re a name in the making, whelp. The question is what kind. So — what will you become?"',
  start: 'q',
  nodes: {
    q: {
      id: 'q',
      text: 'What do you tell the old man — and yourself?',
      choices: [
        {
          label: '"Whatever it takes. I\'ll claw up over anyone in my way."',
          tag: '[Chaotic Evil]',
          resolve: (_g, run) => {
            shiftAlignment(run, -8, -8);
            return rise(run, 'rite_crossroads', 'The old man grins, gap-toothed. "Aye. The world eats the soft. Go on, then — climb over the bones." You rise, harder of heart.');
          },
        },
        {
          label: '"By honest sweat and coin, and no other way."',
          tag: '[Lawful Good]',
          resolve: (_g, run) => {
            shiftAlignment(run, 8, 8);
            run.factions.commons = Math.min(100, run.factions.commons + 5);
            return rise(run, 'rite_crossroads', 'He snorts, but there is respect in it. "Rare, that. We\'ll see how long it lasts." You rise, and the common folk mark you as one of their own.');
          },
        },
        {
          label: '"I\'ll let the work speak. Words are cheap."',
          resolve: (_g, run) => {
            return rise(run, 'rite_crossroads', 'He nods slowly. "Careful. Careful climbs far." You rise, giving nothing away.');
          },
        },
        {
          label: 'Say nothing, and slink back to the gutter you know.',
          resolve: (_g, run) => withdraw(run, 'The fire gutters. You are not ready to be more than you are. Not yet.'),
        },
      ],
    },
  },
};

const master: EncounterDef = {
  id: 'rite_master',
  title: 'A Master\'s Mark',
  intro: 'A powerful patron — a guild master, some say worse — offers to set his mark upon you and open doors no beggar could. "Sponsorship," he calls it. Nothing in England is free.',
  start: 'q',
  nodes: {
    q: {
      id: 'q',
      text: 'How do you answer the patron?',
      choices: [
        {
          label: 'Swear a binding oath of loyal service.',
          tag: '[Lawful]',
          gate: (r) => ethicsBand(r.alignment) !== 'Chaotic',
          gateHint: 'Only one who honours oaths may swear this',
          resolve: (_g, run) => {
            shiftAlignment(run, 10, 0);
            run.factions.crown = Math.min(100, run.factions.crown + 6);
            return rise(run, 'rite_master', 'You kneel and swear. His mark is worth more than gold — doors of office swing open. You rise as a sworn man.');
          },
        },
        {
          label: 'Take his patronage — and privately plan to bury him with it.',
          tag: '[Evil]',
          resolve: (_g, run) => {
            shiftAlignment(run, -6, -12);
            run.coin += 40;
            return rise(run, 'rite_master', 'You smile, and mean none of it. His purse fattens yours today; his throat waits for another night. You rise, a viper in his sleeve.');
          },
        },
        {
          label: 'Refuse. You\'ll answer to no master but yourself.',
          tag: '[Chaotic]',
          resolve: (_g, run) => {
            shiftAlignment(run, -10, 4);
            return rise(run, 'rite_master', 'You turn your back on the offered hand. Harder, this road, and yours alone. You rise unbound.');
          },
        },
        {
          label: 'Ask for time to consider.',
          resolve: (_g, run) => withdraw(run, 'The patron\'s smile thins. "Do not keep me waiting long." You step away, the choice unmade.'),
        },
      ],
    },
  },
};

const trial: EncounterDef = {
  id: 'rite_trial',
  title: 'The Trial of the Notable',
  intro: 'To be counted among the Notable of the shire, you must prove your worth before those who already hold power. They are watching. Choose the manner of your proof.',
  start: 'q',
  nodes: {
    q: {
      id: 'q',
      text: 'How do you make your name among the great?',
      choices: [
        {
          label: 'Seal your reputation with a quiet, ruthless killing.',
          tag: '[Shadow]',
          gate: (r) => moralsBand(r.alignment) === 'Evil' || ethicsBand(r.alignment) === 'Chaotic',
          gateHint: 'Only the Evil or Chaotic have the stomach for this',
          resolve: (_g, run) => {
            shiftAlignment(run, -6, -12);
            run.factions.shadow = Math.min(100, run.factions.shadow + 8);
            run.heat = Math.min(100, run.heat + 15);
            return rise(run, 'rite_trial', 'A rival is found cold in his bed. No one can prove your hand — but everyone knows. You rise, feared.');
          },
        },
        {
          label: 'Move the whole parish with a soaring sermon.',
          tag: '[Church ≥ 30]',
          gate: (r) => r.factions.church >= 30,
          gateHint: 'Requires 30 standing with the Church',
          resolve: (_g, run) => {
            shiftAlignment(run, 6, 6);
            run.factions.church = Math.min(100, run.factions.church + 8);
            return rise(run, 'rite_trial', 'Your words fill the nave and spill into the street. Men weep; the bishop takes note. You rise, revered.');
          },
        },
        {
          label: 'Ruin a rival merchant and seize his trade.',
          tag: '[Merchants ≥ 30]',
          gate: (r) => r.factions.merchants >= 30,
          gateHint: 'Requires 30 standing with the Merchant Guilds',
          resolve: (_g, run) => {
            shiftAlignment(run, -4, -8);
            run.factions.merchants = Math.min(100, run.factions.merchants + 8);
            run.coin += 120;
            return rise(run, 'rite_trial', 'By the time he understands, his warehouses are yours and his name is dust. You rise, and grow rich in the rising.');
          },
        },
        {
          label: 'Simply buy your way in with a lavish bribe (500 coin).',
          tag: '[500 coin]',
          gate: (r) => r.coin >= 500,
          gateHint: 'Requires 500 coin',
          resolve: (_g, run) => {
            run.coin -= 500;
            return rise(run, 'rite_trial', 'Gold, as ever, speaks the plainest tongue in England. The doors open. You rise, purse lighter, station higher.');
          },
        },
        {
          label: 'Withdraw — you are not ready to be tested.',
          resolve: (_g, run) => withdraw(run, 'You bow out of the reckoning. The great turn back to their wine, and forget you. For now.'),
        },
      ],
    },
  },
};

const gambit: EncounterDef = {
  id: 'rite_gambit',
  title: 'The Powerful\'s Gambit',
  intro: 'The truly powerful do not ask permission to rise — they take. But a grasp for real power is a throw of the dice, and failure is ruinous. Choose your gambit.',
  start: 'q',
  nodes: {
    q: {
      id: 'q',
      text: 'Power will not be given. How do you seize it?',
      choices: [
        {
          label: 'Blackmail a baron with secrets your Guild has gathered.',
          tag: '[Shadow ≥ 60] risk',
          gate: (r) => r.factions.shadow >= 60,
          gateHint: 'Requires 60 standing with the Shadow Guild',
          resolve: (_g, run) => {
            const roll = riskRoll(run, run.attrs.cunning + run.factions.shadow / 4, 30);
            if (roll.tier === 'disaster') {
              run.heat = Math.min(100, run.heat + 25);
              run.coin = Math.max(0, run.coin - 2000);
              return { text: 'The baron calls your bluff and sends men to your door. You escape, but poorer and hunted. The gambit fails — try again when you are stronger.', next: null };
            }
            shiftAlignment(run, -6, -8);
            return rise(run, 'rite_gambit', 'The baron reads your letter, goes grey, and yields. His influence is yours to wield. You rise into true power.');
          },
        },
        {
          label: 'Broker a marriage or alliance into a noble house.',
          tag: '[Crown ≥ 50]',
          gate: (r) => r.factions.crown >= 50,
          gateHint: 'Requires 50 standing with the Crown',
          resolve: (_g, run) => {
            shiftAlignment(run, 6, 0);
            run.factions.crown = Math.min(100, run.factions.crown + 6);
            return rise(run, 'rite_gambit', 'Vows are exchanged, lands entailed, and your blood mingles with the mighty. You rise, legitimate at last.');
          },
        },
        {
          label: 'Pour a fortune into buying titles outright (8000 coin).',
          tag: '[8000 coin]',
          gate: (r) => r.coin >= 8000,
          gateHint: 'Requires 8000 coin',
          resolve: (_g, run) => {
            run.coin -= 8000;
            return rise(run, 'rite_gambit', 'A staggering sum changes hands, and with it, a charter of standing. You rise, having bought what others bled for.');
          },
        },
        {
          label: 'Hold back — the throw is too great this day.',
          resolve: (_g, run) => withdraw(run, 'You pocket your ambition. Better a live schemer than a dead one. The gambit waits.'),
        },
      ],
    },
  },
};

const ascent: EncounterDef = {
  id: 'rite_ascent',
  title: 'Into the Halls of Power',
  intro: 'Only a handful in all England stand where you now reach. The Elite do not suffer climbers gladly. To join them is to risk everything you have built — or to command it all.',
  start: 'q',
  nodes: {
    q: {
      id: 'q',
      text: 'The last door before the summit. How do you force it?',
      choices: [
        {
          label: 'Master the shadow network that sits above every throne.',
          tag: '[Shadow ≥ 85] risk',
          gate: (r) => r.factions.shadow >= 85,
          gateHint: 'Requires 85 standing with the Shadow Guild',
          resolve: (_g, run) => {
            const roll = riskRoll(run, run.attrs.cunning + run.attrs.stealth, 35);
            if (roll.tier === 'disaster') {
              run.heat = Math.min(100, run.heat + 30);
              run.health -= 25;
              return { text: 'You reach too far into the dark and something reaches back. Bloodied, you retreat with your life and little else. The halls remain closed — for now.', next: null };
            }
            shiftAlignment(run, -8, -6);
            return rise(run, 'rite_ascent', 'The whisper-lords take your measure and find you worthy of their table. You rise into the true, hidden power of the realm.');
          },
        },
        {
          label: 'Take the mitre or the coronet through faction and favour.',
          tag: '[Church or Crown ≥ 80]',
          gate: (r) => r.factions.church >= 80 || r.factions.crown >= 80,
          gateHint: 'Requires 80 standing with the Church or the Crown',
          resolve: (_g, run) => {
            shiftAlignment(run, 6, 0);
            return rise(run, 'rite_ascent', 'Robed and ringed, you are raised before the assembled great. You rise into the highest circles of England.');
          },
        },
        {
          label: 'Command a fortune vast enough to buy the realm\'s ear (60000 coin).',
          tag: '[60000 coin]',
          gate: (r) => r.coin >= 60000,
          gateHint: 'Requires 60000 coin',
          resolve: (_g, run) => {
            run.coin -= 60000;
            return rise(run, 'rite_ascent', 'Wealth beyond the dreams of your gutter-born self buys a seat that kings must reckon with. You rise, an Elite of the realm.');
          },
        },
        {
          label: 'Not yet. The summit can wait a season more.',
          resolve: (_g, run) => withdraw(run, 'You step back from the last threshold. The Elite will keep. So will your head.'),
        },
      ],
    },
  },
};

export const MILESTONES: Record<string, EncounterDef> = {
  rite_crossroads: crossroads,
  rite_master: master,
  rite_trial: trial,
  rite_gambit: gambit,
  rite_ascent: ascent,
};
