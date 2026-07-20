// The interactive layer (§8). An Encounter is a small data tree of
// nodes → choices → (gates, alignment weights, outcomes). Missions are chains.
//
// This first contract, "A Debt in Coin and Blood", is the vertical slice's
// set-piece: a 3-node chain (approach → the deed → escape) that demonstrates
// gated choices, alignment shifts, a risk roll, mercy vs. murder, a Lawful-Evil
// special route, and a genuine death vector on a botched escape.

import type { GameState, RunState } from './types';
import { riskRoll } from './checks';
import { shiftAlignment, ethicsBand } from './alignment';
import { pushLog, trainAttr } from './helpers';
import { die } from './death';

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

// A modest reward the escape node pays out on success.
const CONTRACT_PAY = 40;

export const CONTRACT: EncounterDef = {
  id: 'contract_taxman',
  title: 'A Debt in Coin and Blood',
  intro:
    'A hooded factor of the Shadow Guild finds you in a tavern nook. "A tax-collector named Osric bleeds this parish dry and skims the rest. Certain parties want him silenced. Forty coin. Do this well, and doors open."',
  start: 'approach',
  nodes: {
    approach: {
      id: 'approach',
      text: 'Osric\'s townhouse sits behind a low wall, a single lantern burning in the gate-house. A servant dozes at the door. How do you get in?',
      choices: [
        {
          label: 'Slip over the wall in the dark',
          tag: '[Stealth 6]',
          gate: (r) => r.attrs.stealth >= 6,
          gateHint: 'Requires Stealth 6',
          resolve: (game, run) => {
            trainAttr(run, 'stealth', 0.3);
            shiftAlignment(run, -6, 0); // trespass — a touch of Chaos
            const roll = riskRoll(run, run.attrs.stealth, 8);
            if (roll.tier === 'disaster') {
              run.heat = Math.min(100, run.heat + 12);
              run.health -= 10;
              return {
                text: 'You misjudge the drop and land hard among clattering pots. A dog erupts. You press on, heart hammering — but the house is awake now.',
                next: 'deed_alert',
              };
            }
            return {
              text: 'You go over the wall like smoke and drop into the garden without a sound. The house sleeps.',
              next: 'deed',
            };
          },
        },
        {
          label: 'Talk your way past the servant',
          tag: '[Charm 6]',
          gate: (r) => r.attrs.charm >= 6,
          gateHint: 'Requires Charm 6',
          resolve: (game, run) => {
            trainAttr(run, 'charm', 0.3);
            const roll = riskRoll(run, run.attrs.charm, 7);
            if (roll.tier === 'disaster') {
              run.heat = Math.min(100, run.heat + 8);
              return {
                text: 'The servant frowns at your story and reaches for a bell. You back away into the night before he can ring it. Another way, then.',
                next: 'deed_alert',
              };
            }
            return {
              text: 'You spin a tale of an urgent message from the sheriff. The drowsy servant waves you through and returns to his nap.',
              next: 'deed',
            };
          },
        },
        {
          label: 'Bribe the gate-guard (5 coin)',
          tag: '[5 coin]',
          gate: (r) => r.coin >= 5,
          gateHint: 'Requires 5 coin',
          resolve: (game, run) => {
            run.coin -= 5;
            shiftAlignment(run, -3, -2);
            return {
              text: 'Silver changes hands. The guard studies the middle distance with great interest as you walk past him into the house.',
              next: 'deed',
            };
          },
        },
        {
          label: 'Kick in the door and take him by force',
          tag: '[Chaotic]',
          resolve: (game, run) => {
            shiftAlignment(run, -14, -6);
            run.heat = Math.min(100, run.heat + 15);
            return {
              text: 'Subtlety is for cowards. You put your boot through the door. Osric shrieks; the whole street will remember this night.',
              next: 'deed_alert',
            };
          },
        },
      ],
    },

    deed: {
      id: 'deed',
      text: 'Osric snores in a wine-heavy sleep, a ledger of stolen tithes open on the table beside a half-full cup. He does not know you are here. What do you do?',
      choices: [
        {
          label: 'Poison his cup and slip away',
          tag: '[Stealth]',
          gate: (r) => r.attrs.stealth >= 5,
          gateHint: 'Requires Stealth 5',
          resolve: (game, run) => {
            shiftAlignment(run, -6, -18); // quiet murder — deeply Evil
            return {
              text: 'A few drops in the wine. He will not wake, tonight or ever. It is done, clean and cold.',
              next: 'escape',
            };
          },
        },
        {
          label: 'A blade across his throat',
          resolve: (game, run) => {
            shiftAlignment(run, -12, -20);
            run.heat = Math.min(100, run.heat + 6);
            return {
              text: 'It is over in a moment, red and certain. The contract is fulfilled — now you must be gone.',
              next: 'escape',
            };
          },
        },
        {
          label: 'Produce a forged warrant and "arrest" him',
          tag: '[Lawful]',
          gate: (r) => ethicsBand(r.alignment) === 'Lawful',
          gateHint: 'Only the Lawful can wield the law as a mask',
          resolve: (game, run) => {
            shiftAlignment(run, 8, -12); // cruelty dressed as order — the Frollo route
            return {
              text: 'You wake him with a forged sheriff\'s warrant and march him out in irons. He will vanish into a gaol from which no appeal returns. The law itself becomes your knife.',
              next: 'escape',
            };
          },
        },
        {
          label: 'Spare him — take the ledger instead',
          tag: '[Good]',
          resolve: (game, run) => {
            shiftAlignment(run, 4, 18); // mercy — Good, but forfeits the full fee
            run.coin += 6;
            return {
              text: 'You cannot do it. Instead you take the ledger of his thefts, worth something to the right buyer, and leave him his wretched life. The Guild will not pay in full for this.',
              next: 'escape_spared',
            };
          },
        },
      ],
    },

    // Reached when the approach went loud — the deed is riskier and forced.
    deed_alert: {
      id: 'deed_alert',
      text: 'The household stirs — shouts, a lamp flaring in an upper window. Osric stumbles out clutching a candlestick, wild-eyed. There is no time for finesse.',
      choices: [
        {
          label: 'Cut him down and run',
          resolve: (game, run) => {
            shiftAlignment(run, -10, -18);
            run.heat = Math.min(100, run.heat + 14);
            const roll = riskRoll(run, run.attrs.brawn, 10);
            if (roll.tier === 'disaster') run.health -= 14;
            return {
              text: 'You close the distance and finish it, taking a candlestick blow across the shoulder for your trouble. The deed is done, loudly.',
              next: 'escape',
            };
          },
        },
        {
          label: 'Abandon the contract and flee',
          tag: '[Good]',
          resolve: (game, run) => {
            shiftAlignment(run, -2, 10);
            run.heat = Math.min(100, run.heat + 6);
            return {
              text: 'Not like this. You vault the wall and vanish, the contract unfulfilled. The Guild pays nothing, but your hands are clean tonight.',
              next: null,
            };
          },
        },
      ],
    },

    escape: {
      id: 'escape',
      text: 'The deed is done. Now the hard part — leaving the parish alive, before the hue and cry goes up.',
      choices: [
        {
          label: 'Melt into the night',
          tag: '[Stealth]',
          gate: (r) => r.attrs.stealth >= 4,
          gateHint: 'Requires Stealth 4',
          resolve: (game, run) => finishEscape(game, run, run.attrs.stealth, 9, CONTRACT_PAY),
        },
        {
          label: 'Walk out calmly as though you belong',
          tag: '[Charm]',
          gate: (r) => r.attrs.charm >= 4,
          gateHint: 'Requires Charm 4',
          resolve: (game, run) => finishEscape(game, run, run.attrs.charm, 8, CONTRACT_PAY),
        },
        {
          label: 'Simply run',
          resolve: (game, run) => finishEscape(game, run, run.attrs.brawn, 12, CONTRACT_PAY),
        },
      ],
    },

    escape_spared: {
      id: 'escape_spared',
      text: 'Ledger under your arm, you make for the wall. Osric will raise no alarm — he does not know his thefts now walk out the door.',
      choices: [
        {
          label: 'Slip away with the evidence',
          resolve: (game, run) => finishEscape(game, run, run.attrs.stealth + 6, 5, 12),
        },
      ],
    },
  },
};

/** Shared escape resolution: a botched getaway is a real death vector. */
function finishEscape(
  game: GameState,
  run: RunState,
  skill: number,
  difficulty: number,
  pay: number,
): EncOutcome {
  const roll = riskRoll(run, skill, difficulty);
  if (roll.tier === 'success') {
    run.coin += pay;
    run.heat = Math.min(100, run.heat + 10);
    pushLog(run, `Contract fulfilled. The Guild pays ${pay} coin into your palm.`, 'good');
    return { text: `You are three streets away before the first scream. ${pay} coin, and a name that now means something in the dark.`, next: null };
  }
  if (roll.tier === 'complication') {
    const half = Math.floor(pay / 2);
    run.coin += half;
    run.heat = Math.min(100, run.heat + 22);
    run.health -= 12;
    pushLog(run, `A ragged escape — ${half} coin and a great deal of Heat.`, 'bad');
    return { text: 'The watch spots you. You lose them in the shambles, but not before your face is seen and a bolt grazes you. Half the fee, and every guard in the parish now wants your head.', next: null };
  }
  // disaster — cornered by the watch. Fight for your life.
  run.heat = Math.min(100, run.heat + 30);
  const hurt = 40 + Math.floor(run.heat / 3);
  run.health -= hurt;
  if (run.health <= 0) {
    die(game, run, 'cut down by the watch while fleeing a contract');
    return { text: 'The watch corners you against a dead-end wall. Steel rings on steel — and then a halberd finds the gap in your guard. You die in a gutter, the contract your last.', next: null };
  }
  pushLog(run, 'You barely escape the watch, gravely wounded and hunted.', 'bad');
  return { text: 'They corner you, and you fight your way clear through a haze of blood and pain. You live — barely — but you are broken and every guard knows your face.', next: null };
}

export const ENCOUNTERS: Record<string, EncounterDef> = {
  [CONTRACT.id]: CONTRACT,
};
