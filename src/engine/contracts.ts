// The Shadow Guild's contract board (§8). Osric's "A Debt in Coin and Blood" was
// the first mark; this file generalises that set-piece into a roster of marks.
//
// Every contract follows the same three-beat template — approach → the deed →
// escape — but each target is a different person with their own crime, dwelling,
// and prize. A factory stamps the template out for each so we get twenty-plus
// distinct missions without twenty-plus hand-written trees.
//
// Fate persists within a life: a mark you KILL is gone for good and will never
// be offered again; a mark you SPARE lives on and can be robbed another night.

import type { GameState, RunState } from './types';
import type { EncounterDef, EncOutcome } from './encounters';
import { riskRoll } from './checks';
import { sway, killEvil, ethicsBand } from './alignment';
import { pushLog, trainAttr, gainStanding } from './helpers';
import { damage } from './survival';
import { nextInt } from './rng';
import { CONTRACT_COOLDOWN } from './state';

// ── target roster ────────────────────────────────────────────────────────────

interface ContractTarget {
  id: string;
  name: string;
  /** "a tax-collector" — set after the name */
  epithet: string;
  /** the crime that marks them, completing "who …" */
  sin: string;
  /** the encounter's title */
  title: string;
  /** where they live — completes "{Name}'s {dwelling} sits …" */
  dwelling: string;
  /** who or what guards the entrance */
  guard: string;
  /** what they are doing when you find them — completes "{Name} {repose}" */
  repose: string;
  /** the valuable you take if you spare them */
  prize: string;
  /** grammatical gender for pronouns */
  g: 'm' | 'f';
  /** the Guild's fee in coppers */
  pay: number;
}

function pron(g: 'm' | 'f') {
  return g === 'f'
    ? { s: 'she', o: 'her', p: 'her', S: 'She' }
    : { s: 'he', o: 'him', p: 'his', S: 'He' };
}

// Osric keeps his original id so old saves and the tutorial-first offer still work.
const TARGETS: ContractTarget[] = [
  {
    id: 'contract_taxman',
    name: 'Osric', epithet: 'a tax-collector', g: 'm',
    sin: 'bleeds this parish dry and skims the rest',
    title: 'A Debt in Coin and Blood',
    dwelling: 'townhouse behind a low wall, a single lantern burning in the gate-house',
    guard: 'A servant dozes at the door.',
    repose: 'snores in a wine-heavy sleep, a ledger of stolen tithes open on the table',
    prize: 'the ledger of his thefts', pay: 40,
  },
  {
    id: 'contract_reeve',
    name: 'Aldous', epithet: 'a manor reeve', g: 'm',
    sin: 'rigs the manor courts and hangs the men who protest it',
    title: 'The Reeve\'s Reckoning',
    dwelling: 'timbered house above the market cross',
    guard: 'A hired watchman leans on his spear, half asleep.',
    repose: 'dozes over the fine-rolls, a cup of claret at his elbow',
    prize: 'a strongbox of extorted fines', pay: 45,
  },
  {
    id: 'contract_fence',
    name: 'Yolande', epithet: 'a fence', g: 'f',
    sin: 'sells her own thieves to the sheriff when the price is right',
    title: 'No Honour Among Thieves',
    dwelling: 'cellar-shop off the tanners\' row',
    guard: 'A deaf old porter nods on a stool.',
    repose: 'counts stolen plate by candlelight, alone',
    prize: 'a coffer of fenced silver', pay: 50,
  },
  {
    id: 'contract_friar',
    name: 'Bartholomew', epithet: 'a friar', g: 'm',
    sin: 'wrings confession-coin from the dying and lets the poor rot unshriven',
    title: 'A Sin Wrapped in Cloth',
    dwelling: 'friary cell behind the almonry',
    guard: 'A novice sweeps the cloister, incurious.',
    repose: 'kneels at a private altar, gold rings on his praying hands',
    prize: 'a reliquary stuffed with hush-money', pay: 55,
  },
  {
    id: 'contract_usurer',
    name: 'Gaultier', epithet: 'a usurer', g: 'm',
    sin: 'ruins widows with crooked loans and buys their children\'s indentures',
    title: 'The Weight of Debt',
    dwelling: 'stone counting-house with barred windows',
    guard: 'A mastiff paces the yard on a long chain.',
    repose: 'pores over his debt-book behind a bolted door',
    prize: 'a bag of gold and the debt-book itself', pay: 60,
  },
  {
    id: 'contract_bailiff',
    name: 'Crane', epithet: 'a sheriff\'s bailiff', g: 'm',
    sin: 'brands the innocent and pockets the bail of the guilty',
    title: 'The Bailiff\'s Brand',
    dwelling: 'lodging above the gaol-house gate',
    guard: 'Two drunk sergeants dice by the door.',
    repose: 'sleeps off his ale, keys and cudgel on the floor',
    prize: 'a purse of stolen bail-coin', pay: 60,
  },
  {
    id: 'contract_poisoner',
    name: 'Isolde', epithet: 'a poisoner-for-hire', g: 'f',
    sin: 'has salted a dozen graves and now works for your rivals',
    title: 'A Cup for the Cup-Bearer',
    dwelling: 'apothecary\'s garret above the herb-market',
    guard: 'The shop is shuttered; a cat watches from the sill.',
    repose: 'grinds her powders late, masked against her own fumes',
    prize: 'a locked case of rare venoms', pay: 65,
  },
  {
    id: 'contract_slaver',
    name: 'Coll', epithet: 'a wool-merchant', g: 'm',
    sin: 'ships stolen children south under bales of wool and calls it trade',
    title: 'Cargo of Flesh',
    dwelling: 'warehouse on the river-stairs',
    guard: 'A bored guard picks his teeth by a brazier.',
    repose: 'tallies his manifest in a lamplit office above the bales',
    prize: 'a chest of blood-money', pay: 70,
  },
  {
    id: 'contract_warden',
    name: 'Hobbes', epithet: 'a gaol-warden', g: 'm',
    sin: 'starves his prisoners to sell their bread and their bones',
    title: 'The Warden\'s Larder',
    dwelling: 'keeper\'s house within the gaol wall',
    guard: 'A turnkey snores across the threshold.',
    repose: 'gorges alone at a full table while the cells go hungry',
    prize: 'the gaol\'s garnish-money', pay: 65,
  },
  {
    id: 'contract_spymistress',
    name: 'Ravenna', epithet: 'a spymistress', g: 'f',
    sin: 'sells the Guild\'s own secrets to the Crown, name by name',
    title: 'The Whisper That Betrays',
    dwelling: 'walled garden-house at the edge of the quarter',
    guard: 'A silent footman waits in the dark hall.',
    repose: 'seals her ciphered letters by a shaded lamp',
    prize: 'a folio of the Guild\'s stolen secrets', pay: 80,
  },
  {
    id: 'contract_rival',
    name: 'Perrin', epithet: 'a rival guildmaster', g: 'm',
    sin: 'has sworn to see you hanged before the year is out',
    title: 'Him or You',
    dwelling: 'fortified townhouse with a private guard',
    guard: 'A watchful bravo patrols the forecourt.',
    repose: 'plots your ruin over a map of the quarter, late into the night',
    prize: 'his war-chest of bribes', pay: 85,
  },
  {
    id: 'contract_plaguedoc',
    name: 'Sual', epithet: 'a plague-doctor', g: 'm',
    sin: 'robs the quarantined dead and sells their rings back to their kin',
    title: 'The Beaked Thief',
    dwelling: 'sealed house in the plague-struck lane',
    guard: 'A watchman keeps his distance, terrified of the door.',
    repose: 'sorts the jewellery of the dead by a shuttered window',
    prize: 'a satchel of the dead\'s stolen gold', pay: 70,
  },
  {
    id: 'contract_hoarder',
    name: 'Voss', epithet: 'an alderman', g: 'm',
    sin: 'hoards the town\'s grain to starve the price up while children beg',
    title: 'Bread and Bones',
    dwelling: 'fine house beside his stuffed granaries',
    guard: 'A granary guard dozes against the locked doors.',
    repose: 'sleeps soundly above a cellar of hoarded wheat',
    prize: 'the keys to his granaries and a fat purse', pay: 75,
  },
  {
    id: 'contract_captain',
    name: 'Dunmore', epithet: 'a mercenary captain', g: 'm',
    sin: 'burned a village to the ground and laughed about the price',
    title: 'Ash and Answer',
    dwelling: 'commandeered inn full of his sleeping soldiers',
    guard: 'A sentry drowses over his pike at the stair.',
    repose: 'sprawls drunk in the best room, sword within reach',
    prize: 'his loot from the burning', pay: 90,
  },
  {
    id: 'contract_witchfinder',
    name: 'Marsh', epithet: 'a witch-finder', g: 'f',
    sin: 'drowns harmless old women for the silver their accusers pay',
    title: 'The Finder Found',
    dwelling: 'grim cottage past the ducking-pond',
    guard: 'Her hired ducker sleeps in the lean-to.',
    repose: 'tallies her bounties by a mean tallow light',
    prize: 'a box of blood-silver', pay: 70,
  },
  {
    id: 'contract_knight',
    name: 'Alric', epithet: 'a disgraced knight', g: 'm',
    sin: 'robs and murders travellers on the north road under cover of his rank',
    title: 'The Fallen Sword',
    dwelling: 'ruined grange he has made his robber-hall',
    guard: 'A scarred squire keeps a poor watch at the gate.',
    repose: 'sleeps in his mail by the hall-fire, blade across his knees',
    prize: 'the travellers\' stolen valuables', pay: 90,
  },
  {
    id: 'contract_provost',
    name: 'Emeric', epithet: 'a provost', g: 'm',
    sin: 'forges deeds to steal church lands from the parishes he serves',
    title: 'The Forger\'s Hand',
    dwelling: 'scriptorium lodging behind the chapter-house',
    guard: 'A clerk snores over his desk in the antechamber.',
    repose: 'works late at his forgeries, wax and seals spread before him',
    prize: 'a case of forged deeds and true gold', pay: 80,
  },
  {
    id: 'contract_assassin',
    name: 'Hettie', epithet: 'a rival assassin', g: 'f',
    sin: 'has taken the same coin to bury you first',
    title: 'The Race to the Knife',
    dwelling: 'bolt-hole above a closed cook-shop',
    guard: 'A tripwire and a bell guard the stair — no one else.',
    repose: 'hones her blades by the window, watching the street for you',
    prize: 'her fee and her fine tools', pay: 95,
  },
  {
    id: 'contract_steward',
    name: 'Godric', epithet: 'a baron\'s steward', g: 'm',
    sin: 'skims the Baron\'s levies and lets the peasants hang for the shortfall',
    title: 'The Steward\'s Skim',
    dwelling: 'steward\'s wing of the castle undercroft',
    guard: 'A castle guard makes a slow, sleepy round.',
    repose: 'balances two sets of books by a guttering candle',
    prize: 'the skimmed levy-silver', pay: 85,
  },
  {
    id: 'contract_pardoner',
    name: 'Quill', epithet: 'a pardoner', g: 'm',
    sin: 'sells forged indulgences to the dying and pockets their last coin',
    title: 'Pardons for Sale',
    dwelling: 'wagon-lodging behind the pilgrim inn',
    guard: 'His mule-boy sleeps under the wagon.',
    repose: 'counts the day\'s takings among his fake relics',
    prize: 'a chest of gulled pilgrims\' coin', pay: 65,
  },
  {
    id: 'contract_headsman',
    name: 'Mott', epithet: 'a headsman', g: 'm',
    sin: 'sells private killings on the side of his lawful axe',
    title: 'The Axe for Hire',
    dwelling: 'executioner\'s cottage outside the walls',
    guard: 'No guard — only his grim reputation and a barred door.',
    repose: 'sharpens his tools alone by the fire',
    prize: 'his hoard of murder-fees', pay: 100,
  },
];

const BY_ID: Record<string, ContractTarget> = Object.fromEntries(TARGETS.map((t) => [t.id, t]));

// ── fate (kill / spare) ──────────────────────────────────────────────────────

type Fate = 'dead' | 'spared';

function markFate(run: RunState, id: string, fate: Fate): void {
  if (!run.contractFates) run.contractFates = {};
  if (run.contractFates[id] === 'dead') return; // a corpse cannot be un-killed
  run.contractFates[id] = fate;
}

/** Marks the player can still be sent after: the dead are gone for good; the
 *  spared remain fair game. */
export function eligibleTargets(run: RunState): ContractTarget[] {
  return TARGETS.filter((t) => run.contractFates?.[t.id] !== 'dead');
}

/** Choose the next mark. The very first offer of a life is always Osric — the
 *  Guild's proving job — after which marks are drawn at random from the living. */
export function pickContractTarget(run: RunState): ContractTarget | null {
  const osric = TARGETS[0];
  const firstOffer = (run.contractsOffered ?? 0) === 0;
  if (firstOffer && run.contractFates?.[osric.id] !== 'dead') return osric;
  const pool = eligibleTargets(run);
  if (pool.length === 0) return null;
  return pool[nextInt(run, 0, pool.length - 1)];
}

export function contractById(id: string): ContractTarget | undefined {
  return BY_ID[id];
}

/** The fee a contract pays, scaled by the player's rank — the Guild trusts the
 *  risen with weightier, better-paid work (+10% of base per rank above Beggar). */
export function contractPay(t: ContractTarget, rank: number): number {
  return Math.round(t.pay * (1 + Math.max(0, rank - 1) * 0.1));
}

/** Was this mark spared before? (Used to colour a repeat offer.) */
export function wasSpared(run: RunState, id: string): boolean {
  return run.contractFates?.[id] === 'spared';
}

// ── the shared template ──────────────────────────────────────────────────────

/** Called the moment the player commits to an approach — the offer is spent and
 *  the timer for the next one begins. Deferring never calls this, so the offer
 *  stays available as a scroll to return to. */
function commitContract(run: RunState): void {
  run.contractAvailable = false;
  run.contractTargetId = null;
  run.contractCooldown = CONTRACT_COOLDOWN;
}

/** Shared escape resolution. The Guild pays for the KILL, not the getaway: once
 *  the deed is done the full fee is yours even if the watch glimpses you fleeing.
 *  A botched escape costs you in Heat and blood — and can still kill you — but it
 *  never docks the promised coppers. (Sparing pays a smaller, fixed prize.) */
function finishEscape(
  game: GameState,
  run: RunState,
  skill: number,
  difficulty: number,
  pay: number,
): EncOutcome {
  const standing = pay >= 30 ? 12 : 4; // full contract vs. a spared mark's prize
  const roll = riskRoll(run, skill, difficulty);

  if (roll.tier === 'success') {
    run.coin += pay;
    run.heat = Math.min(100, run.heat + 10);
    gainStanding(run, 'shadow', standing);
    pushLog(run, `Contract fulfilled. The Guild pays ${pay} coppers into your palm.`, 'good');
    return {
      text: `You are three streets away before the first scream. ${pay} coppers, and a name that now means something in the dark.`,
      next: null,
    };
  }

  if (roll.tier === 'complication') {
    run.heat = Math.min(100, run.heat + 22);
    damage(game, run, 2, 'slain fleeing a botched contract');
    if (!run.alive) return { text: 'The watch runs you down in the shambles. You do not get up.', next: null };
    run.coin += pay; // the job was done — the Guild pays in full
    gainStanding(run, 'shadow', standing);
    pushLog(run, `The full ${pay} copper is yours — but a bloody, seen escape leaves every guard hunting you.`, 'bad');
    return {
      text: `The deed is done and the Guild pays in full — ${pay} coppers. But a bolt grazes you and your face is marked; every guard in the parish now wants your head.`,
      next: null,
    };
  }

  // disaster — cornered by the watch. Fight for your life.
  run.heat = Math.min(100, run.heat + 30);
  const hurt = 4 + Math.floor(run.heat / 25);
  damage(game, run, hurt, 'cut down by the watch while fleeing a contract');
  if (!run.alive) {
    return {
      text: 'The watch corners you against a dead-end wall. Steel rings on steel — and then a halberd finds the gap in your guard. You die in a gutter, the contract your last.',
      next: null,
    };
  }
  run.coin += pay; // you lived, and the deed still counts
  gainStanding(run, 'shadow', standing);
  pushLog(run, `You barely escape with your life — but the ${pay}-copper fee is clutched in a bloody fist.`, 'bad');
  return {
    text: `They corner you, and you fight your way clear through a haze of blood and pain. You live — barely — the ${pay} coppers yours, but every guard knows your face.`,
    next: null,
  };
}

const SPARE_PRIZE = 12; // a spared mark's stolen valuable is worth far less than the fee

/** Stamp the three-beat contract tree out for a single target. */
export function makeContract(t: ContractTarget): EncounterDef {
  const P = pron(t.g);
  return {
    id: t.id,
    title: t.title,
    intro:
      `A hooded factor of the Shadow Guild finds you in a tavern nook. "${t.name}, ${t.epithet} who ${t.sin}. ` +
      `Certain parties want ${P.o} silenced. {FEE} coppers. Do this well, and doors open."`,
    start: 'approach',
    nodes: {
      approach: {
        id: 'approach',
        text: `${t.name}'s ${t.dwelling}. ${t.guard} How do you get in?`,
        choices: [
          {
            label: 'Slip over the wall in the dark',
            tag: '[Stealth 6]',
            gate: (r) => r.attrs.stealth >= 6,
            gateHint: 'Requires Stealth 6',
            resolve: (game, run) => {
              commitContract(run);
              trainAttr(run, 'stealth', 0.3);
              sway(run, -1, 0); // trespass — a touch of Chaos
              const roll = riskRoll(run, run.attrs.stealth, 8);
              if (roll.tier === 'disaster') {
                run.heat = Math.min(100, run.heat + 12);
                damage(game, run, 1, 'killed breaking into a manor');
                if (!run.alive) return { text: 'You misjudge the drop, crack your skull on the flagstones, and never rise.', next: null };
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
            label: 'Talk your way past the doorkeeper',
            tag: '[Charm 6]',
            gate: (r) => r.attrs.charm >= 6,
            gateHint: 'Requires Charm 6',
            resolve: (game, run) => {
              commitContract(run);
              trainAttr(run, 'charm', 0.3);
              const roll = riskRoll(run, run.attrs.charm, 7);
              if (roll.tier === 'disaster') {
                run.heat = Math.min(100, run.heat + 8);
                return {
                  text: 'Your story frays under a hard stare and a hand reaches for a bell. You back away into the night before it can ring. Another way, then.',
                  next: 'deed_alert',
                };
              }
              return {
                text: 'You spin a tale of an urgent message from the sheriff. The drowsy doorkeeper waves you through and returns to his nap.',
                next: 'deed',
              };
            },
          },
          {
            label: 'Bribe your way in (20 coppers)',
            tag: '[20 coppers]',
            gate: (r) => r.coin >= 20,
            gateHint: 'Requires 20 coppers',
            resolve: (game, run) => {
              commitContract(run);
              run.coin -= 20;
              sway(run, -1, -1);
              return {
                text: 'Copper changes hands. The guard studies the middle distance with great interest as you walk past into the house.',
                next: 'deed',
              };
            },
          },
          {
            label: `Kick in the door and take ${P.o} by force`,
            tag: '[Chaotic]',
            resolve: (game, run) => {
              commitContract(run);
              sway(run, -1, -1);
              run.heat = Math.min(100, run.heat + 15);
              return {
                text: `Subtlety is for cowards. You put your boot through the door. ${t.name} cries out; the whole street will remember this night.`,
                next: 'deed_alert',
              };
            },
          },
          {
            label: 'Slip away — decide on this another time',
            resolve: (_game, _run) => ({
              text: 'You pocket the offer for now. The factor said it would keep — the scroll waits whenever you are ready.',
              next: null,
            }),
          },
        ],
      },

      deed: {
        id: 'deed',
        text: `${t.name} ${t.repose}. ${P.S} does not know you are here. What do you do?`,
        choices: [
          {
            label: 'A silent poison, and slip away',
            tag: '[Stealth]',
            gate: (r) => r.attrs.stealth >= 5,
            gateHint: 'Requires Stealth 5',
            resolve: (_game, run) => {
              sway(run, -1, 0); // stealthy trespass — a touch of Chaos
              killEvil(run); // …but a murder is a murder: Evil +1–3
              markFate(run, t.id, 'dead');
              return {
                text: `A few drops where ${P.s} will drink them. ${P.S} will not wake, tonight or ever. It is done, clean and cold.`,
                next: 'escape',
              };
            },
          },
          {
            label: 'A blade, quick and certain',
            resolve: (_game, run) => {
              sway(run, -1, 0);
              killEvil(run); // a blade across the throat: Evil +1–3
              run.heat = Math.min(100, run.heat + 6);
              markFate(run, t.id, 'dead');
              return {
                text: 'It is over in a moment, red and certain. The contract is fulfilled — now you must be gone.',
                next: 'escape',
              };
            },
          },
          {
            label: `Produce a forged warrant and "arrest" ${P.o}`,
            tag: '[Lawful]',
            gate: (r) => ethicsBand(r.alignment) === 'Lawful',
            gateHint: 'Only the Lawful can wield the law as a mask',
            resolve: (_game, run) => {
              sway(run, 1, 0); // cruelty dressed as order — the Frollo route (Lawful)
              killEvil(run); // condemning them to die in a gaol is still a killing
              markFate(run, t.id, 'dead');
              return {
                text: `You wake ${P.o} with a forged sheriff's warrant and march ${P.o} out in irons — into a gaol from which no appeal returns. The law itself becomes your knife.`,
                next: 'escape',
              };
            },
          },
          {
            label: `Spare ${P.o} — take the prize instead`,
            tag: '[Good]',
            resolve: (_game, run) => {
              sway(run, 0, 1); // mercy — Good, but forfeits the full fee
              markFate(run, t.id, 'spared');
              run.coin += 6;
              return {
                text: `You cannot do it. Instead you take ${t.prize}, worth something to the right buyer, and leave ${P.o} the wretched life. The Guild will not pay in full for this.`,
                next: 'escape_spared',
              };
            },
          },
        ],
      },

      deed_alert: {
        id: 'deed_alert',
        text: `The household stirs — shouts, a lamp flaring. ${t.name} stumbles out wild-eyed, snatching up whatever will serve as a weapon. There is no time for finesse.`,
        choices: [
          {
            label: `Cut ${P.o} down and run`,
            resolve: (game, run) => {
              sway(run, -1, 0);
              run.heat = Math.min(100, run.heat + 14);
              const roll = riskRoll(run, run.attrs.brawn, 10);
              if (roll.tier === 'disaster') {
                damage(game, run, 2, 'beaten to death by a cornered mark');
                if (!run.alive) return { text: `${t.name}'s wild blow catches your temple and the world goes black. ${P.S} stands over your body, shaking.`, next: null };
              }
              killEvil(run); // cutting them down: Evil +1–3
              markFate(run, t.id, 'dead');
              return {
                text: 'You close the distance and finish it, taking a blow across the shoulder for your trouble. The deed is done, loudly.',
                next: 'escape',
              };
            },
          },
          {
            label: 'Abandon the contract and flee',
            tag: '[Good]',
            resolve: (_game, run) => {
              sway(run, 0, 1);
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
            resolve: (game, run) => finishEscape(game, run, run.attrs.stealth, 7, contractPay(t, run.rank)),
          },
          {
            label: 'Walk out calmly as though you belong',
            tag: '[Charm]',
            gate: (r) => r.attrs.charm >= 4,
            gateHint: 'Requires Charm 4',
            resolve: (game, run) => finishEscape(game, run, run.attrs.charm, 8, contractPay(t, run.rank)),
          },
          {
            label: 'Simply run',
            resolve: (game, run) => finishEscape(game, run, run.attrs.brawn, 12, contractPay(t, run.rank)),
          },
        ],
      },

      escape_spared: {
        id: 'escape_spared',
        text: `Prize under your arm, you make for the wall. ${t.name} will raise no alarm — ${P.s} does not yet know ${P.s} has been robbed.`,
        choices: [
          {
            label: 'Slip away with the goods',
            resolve: (game, run) => finishEscape(game, run, run.attrs.stealth + 6, 5, SPARE_PRIZE),
          },
        ],
      },
    },
  };
}

/** Every contract, generated from the roster. */
export const CONTRACTS: Record<string, EncounterDef> = Object.fromEntries(
  TARGETS.map((t) => [t.id, makeContract(t)]),
);
