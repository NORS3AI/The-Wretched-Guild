// Random events (§8, the lighter cousin of contracts). Now and then life in the
// town throws a small choice at you — a harvest to lend a hand to, a chapel bell,
// an unguarded stall, a dropped purse. Unlike the Shadow Guild's killing work,
// most of these are honest (or at least bloodless), and many are chances to do
// good. Each is a one-beat encounter resolved with a single choice.

import type { RunState } from './types';
import type { EncounterDef } from './encounters';
import { sway } from './alignment';
import { pushLog, trainAttr, gainStanding } from './helpers';
import { nextInt, chance } from './rng';
import { addItem, removeItem, itemDef } from './items';

function clamp100(v: number): number {
  return Math.max(0, Math.min(100, v));
}

/** Does the player carry anything edible to give away? (food lives in the larder) */
function hasFoodToGive(run: RunState): boolean {
  return [...run.larder, ...run.pockets].some((p) => p && (itemDef(p.item)?.food ?? 0) > 0);
}
function giveAwayFood(run: RunState): string | null {
  for (const p of [...run.larder, ...run.pockets]) {
    if (p && (itemDef(p.item)?.food ?? 0) > 0) {
      removeItem(run, p.item, 1);
      return itemDef(p.item)!.name.toLowerCase();
    }
  }
  return null;
}

export const EVENTS: EncounterDef[] = [
  // ── farming / commons (good) ────────────────────────────────────────────────
  {
    id: 'event_harvest',
    title: 'A Hand at the Harvest',
    intro: 'A farmer, racing the black clouds rolling in, waves you over. "You there! Lend a hand bringing in the barley before the rain, and there\'s coin and a meal in it."',
    start: 'q',
    nodes: {
      q: {
        id: 'q',
        text: 'The first drops are already falling. What do you do?',
        choices: [
          {
            label: 'Throw your back into it and save the harvest',
            resolve: (_g, run) => {
              const coin = nextInt(run, 3, 6);
              run.coin += coin;
              gainStanding(run, 'commons', 1);
              sway(run, 1, 1); // honest, generous toil — Lawful Good
              trainAttr(run, 'brawn', 0.2);
              if (chance(run, 0.5)) addItem(run, 'bread', 1);
              return { text: `You haul barley until your arms burn, and the crop is in before the storm breaks. The farmer presses ${coin} copper and a crust into your hands, grateful.`, next: null };
            },
          },
          {
            label: 'Name your price before you lift a finger',
            resolve: (_g, run) => {
              const coin = nextInt(run, 4, 7);
              run.coin += coin;
              gainStanding(run, 'commons', 0.3);
              return { text: `You haggle first, then work. ${coin} copper, fairly earned — though the farmer thinks you a hard sort.`, next: null };
            },
          },
          {
            label: 'Not your barley, not your problem — walk on',
            resolve: (_g, _run) => ({ text: 'You leave the farmer to his ruin and walk on through the rain.', next: null }),
          },
        ],
      },
    },
  },

  // ── church worship (good) ───────────────────────────────────────────────────
  {
    id: 'event_chapel_bell',
    title: 'The Chapel Bell',
    intro: 'The chapel bell tolls for evening service. Warm light spills from the open door, and voices rise in a hymn within.',
    start: 'q',
    nodes: {
      q: {
        id: 'q',
        text: 'Do you go in?',
        choices: [
          {
            label: 'Kneel and pray with the faithful',
            resolve: (_g, run) => {
              sway(run, 1, 1); // devotion — Good, and Lawful
              gainStanding(run, 'church', 1.5);
              trainAttr(run, 'piety', 0.2);
              return { text: 'You kneel among the townsfolk and let the hymn carry you. For a while, the gutter feels far away. The priest marks your devotion.', next: null };
            },
          },
          {
            label: 'Slip in only to steal the warmth',
            resolve: (_g, run) => {
              run.needs.comfort = clamp100(run.needs.comfort + 30);
              return { text: 'You linger at the back, soaking up the candle-warmth, and slip out before the collection plate comes round.', next: null };
            },
          },
          {
            label: 'Pass it by',
            resolve: (_g, _run) => ({ text: 'The hymn fades behind you as you go on your way.', next: null }),
          },
        ],
      },
    },
  },

  // ── stealing opportunity (illicit) ──────────────────────────────────────────
  {
    id: 'event_unguarded_stall',
    title: 'An Unguarded Stall',
    intro: 'A pedlar has stepped away to argue with a neighbour, leaving his stall of pies, trinkets, and coin-box unwatched. No one is looking your way.',
    start: 'q',
    nodes: {
      q: {
        id: 'q',
        text: 'The stall is yours for the taking. Do you?',
        choices: [
          {
            label: 'Sweep what you can into your pockets',
            tag: '[Chaotic]',
            resolve: (_g, run) => {
              const coin = nextInt(run, 5, 12);
              run.coin += coin;
              run.heat = Math.min(100, run.heat + 5);
              sway(run, -1, -1); // theft — Chaotic and a little Evil
              trainAttr(run, 'stealth', 0.2);
              return { text: `You palm ${coin} copper of goods and melt into the crowd before the pedlar turns round. Easy — but the watch will hear of it.`, next: null };
            },
          },
          {
            label: 'Take only a pie to fill your belly',
            resolve: (_g, run) => {
              run.needs.food = clamp100(run.needs.food + 30);
              run.heat = Math.min(100, run.heat + 1);
              sway(run, 0, -1); // small theft — a touch of Evil
              return { text: 'You snatch a single hot pie and eat it in an alley. Just enough to quiet the hunger, and not enough to be missed. Probably.', next: null };
            },
          },
          {
            label: 'Leave it — it isn\'t yours to take',
            tag: '[Good]',
            resolve: (_g, run) => {
              sway(run, 0, 1); // restraint — Good
              return { text: 'You could. You don\'t. The pedlar returns none the wiser, and you walk on with clean hands, if an empty belly.', next: null };
            },
          },
        ],
      },
    },
  },

  // ── a dropped purse (good vs evil) ──────────────────────────────────────────
  {
    id: 'event_lost_purse',
    title: 'A Dropped Purse',
    intro: 'A well-dressed gentleman hurries past and, without noticing, drops a fat purse into the mud at your feet. He is already twenty paces gone.',
    start: 'q',
    nodes: {
      q: {
        id: 'q',
        text: 'The purse lies at your feet. What do you do?',
        choices: [
          {
            label: 'Call after him and return it',
            tag: '[Good]',
            resolve: (_g, run) => {
              const reward = nextInt(run, 3, 8);
              run.coin += reward;
              gainStanding(run, 'commons', 1);
              gainStanding(run, 'merchants', 0.5);
              sway(run, 1, 1); // honesty — Lawful Good
              return { text: `You chase him down and press the purse back into his hands. Astonished, he gives you ${reward} copper for your honesty — and remembers your face kindly.`, next: null };
            },
          },
          {
            label: 'Pocket it and walk the other way',
            tag: '[Evil]',
            resolve: (_g, run) => {
              const coin = nextInt(run, 10, 20);
              run.coin += coin;
              run.heat = Math.min(100, run.heat + 3);
              sway(run, -1, -1); // theft by finding — Evil, a little Chaotic
              return { text: `The purse holds ${coin} copper. You are three streets away before the gentleman even claps his empty pocket.`, next: null };
            },
          },
        ],
      },
    },
  },

  // ── charity to a child (good) ───────────────────────────────────────────────
  {
    id: 'event_beggar_child',
    title: 'A Child in Rags',
    intro: 'A child, thin as a rail and blue with cold, holds out a trembling hand. "Please, sir. A copper. Anything."',
    start: 'q',
    nodes: {
      q: {
        id: 'q',
        text: 'The child looks up at you with hollow eyes.',
        choices: [
          {
            label: 'Share your food with the child',
            tag: '[Good]',
            gate: (r) => hasFoodToGive(r),
            gateHint: 'You have nothing to eat to give',
            resolve: (_g, run) => {
              const name = giveAwayFood(run);
              sway(run, 0, 1);
              sway(run, 0, 1); // a real kindness — Good, twice over
              gainStanding(run, 'commons', 0.5);
              return { text: `You crouch and give the child your ${name ?? 'food'}. They devour it and, for a moment, smile. It costs you a meal and buys you nothing but a lighter soul.`, next: null };
            },
          },
          {
            label: 'Give a copper',
            gate: (r) => r.coin >= 1,
            gateHint: 'You have no copper to spare',
            resolve: (_g, run) => {
              run.coin -= 1;
              sway(run, 0, 1); // charity — Good
              return { text: 'You drop your last copper into the small, cold hand. The child clutches it like treasure and darts away.', next: null };
            },
          },
          {
            label: 'Turn away — you have troubles enough',
            resolve: (_g, run) => {
              sway(run, 0, -1); // hardness — a touch of Evil
              return { text: 'You turn your face away. The child\'s hand drops, and you tell yourself you cannot save everyone.', next: null };
            },
          },
        ],
      },
    },
  },

  // ── helping a stranger (good / commons) ─────────────────────────────────────
  {
    id: 'event_mired_cart',
    title: 'A Cart in the Mire',
    intro: 'A carter\'s wheels are sunk to the axle in the mud, his mule blowing and useless. He heaves at the spokes, red-faced and cursing.',
    start: 'q',
    nodes: {
      q: {
        id: 'q',
        text: 'He hasn\'t the strength to free it alone.',
        choices: [
          {
            label: 'Put your shoulder to the wheel',
            resolve: (_g, run) => {
              const coin = nextInt(run, 3, 6);
              run.coin += coin;
              gainStanding(run, 'commons', 0.8);
              gainStanding(run, 'merchants', 0.4);
              sway(run, 1, 1); // Lawful Good
              trainAttr(run, 'brawn', 0.2);
              return { text: `You heave until the cart lurches free with a great sucking sound. The carter, filthy and grinning, gives you ${coin} copper and a hearty thump on the back.`, next: null };
            },
          },
          {
            label: 'Offer to help — for a price',
            resolve: (_g, run) => {
              const coin = nextInt(run, 5, 9);
              run.coin += coin;
              return { text: `You name a price, he grudgingly agrees, and together you free the cart. ${coin} copper for a muddy afternoon.`, next: null };
            },
          },
          {
            label: 'Leave him to it',
            resolve: (_g, _run) => ({ text: 'You step around the mired cart and go on your way.', next: null }),
          },
        ],
      },
    },
  },

  // ── a wandering preacher (church / good) ────────────────────────────────────
  {
    id: 'event_preacher',
    title: 'A Wandering Preacher',
    intro: 'A ragged friar preaches on a mounting-block to a small, restless crowd, exhorting them to charity and warning of the fires below.',
    start: 'q',
    nodes: {
      q: {
        id: 'q',
        text: 'His eye falls on you as he passes the alms-bowl.',
        choices: [
          {
            label: 'Drop a coin in the alms-bowl',
            gate: (r) => r.coin >= 2,
            gateHint: 'You have nothing to give',
            resolve: (_g, run) => {
              run.coin -= 2;
              sway(run, 0, 1);
              gainStanding(run, 'church', 2);
              trainAttr(run, 'piety', 0.15);
              return { text: 'You give two copper to the poor-bowl. The friar blesses you loudly, and the Church takes note of a generous soul.', next: null };
            },
          },
          {
            label: 'Stay and take his words to heart',
            resolve: (_g, run) => {
              sway(run, 0, 1); // reflection — a little Good
              gainStanding(run, 'church', 0.5);
              return { text: 'You linger at the edge of the crowd and let the sermon settle into you. Something in it stays with you.', next: null };
            },
          },
          {
            label: 'Heckle the old fraud and move on',
            tag: '[Chaotic]',
            resolve: (_g, run) => {
              sway(run, -1, 0); // mockery — Chaotic
              return { text: 'You call out a mocking word; the crowd laughs, the friar reddens, and you saunter off well pleased with yourself.', next: null };
            },
          },
        ],
      },
    },
  },
];

/** Pick a random event to spring on the player. */
export function pickEvent(run: RunState): EncounterDef {
  return EVENTS[nextInt(run, 0, EVENTS.length - 1)];
}
