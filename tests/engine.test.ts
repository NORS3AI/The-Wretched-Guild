// Headless regression test for the pure engine — no browser, no framework.
// Run with `npm test`. Exercises the real reducers so game rules can't silently
// rot as systems are added.

import { newGame } from '../src/engine/state';
import { advanceTick, dispatch } from '../src/engine/engine';
import { ENCOUNTERS } from '../src/engine/encounters';
import { alignmentName } from '../src/engine/alignment';
import { computeTokens } from '../src/engine/death';
import { formatMoney } from '../src/engine/money';
import { rankTitle } from '../src/engine/ranks';
import { addItem, countItem, MAX_STACK, itemDef, isEdible } from '../src/engine/items';
import { processGuild } from '../src/engine/guild';

// Advance one tick, then dismiss any random town event that popped up (it would
// otherwise halt the sim and stall the fast-forward loops below). Tests that
// exercise events do so explicitly via their own encounters.
function advance(g: ReturnType<typeof newGame>): void {
  advanceTick(g);
  if (g.run.encounter && g.run.encounter.defId.startsWith('event_')) g.run.encounter = null;
}

let failures = 0;
function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.log('  ✗ FAIL:', msg);
    failures++;
  } else {
    console.log('  ✓', msg);
  }
}

// Advance time while keeping the wretch fed/watered/warm, to isolate systems
// that aren't about survival from the new needs layer.
function ff(g: ReturnType<typeof newGame>, n: number): void {
  for (let i = 0; i < n; i++) {
    Object.assign(g.run.needs, { food: 100, water: 100, comfort: 100, relief: 100 });
    g.run.illness = 'none';
    advance(g);
    if (!g.run.alive) break;
  }
}

console.log('The Wretched Guild — engine tests\n');

// 1) Idle labour accrues coin and nudges alignment toward Lawful.
{
  const g = newGame();
  dispatch(g, { type: 'setActivity', id: 'fell_timber' });
  ff(g, 200);
  assert(g.run.coin > 0, `idle labour earned coin (got ${g.run.coin})`);
  assert(g.run.alignment.ethics > 0, `honest toil nudged toward Lawful (ethics ${g.run.alignment.ethics.toFixed(1)})`);
}

// 2) A contract is offered; a murderous route shifts alignment toward Evil.
{
  const g = newGame();
  dispatch(g, { type: 'setActivity', id: 'beg' });
  let guard = 0;
  while (!g.run.contractAvailable && guard++ < 5000) advance(g);
  assert(g.run.contractAvailable, 'a contract is offered within reasonable time');

  g.run.stocksUntil = null; // begging may have landed us in the stocks; free us to test the contract
  dispatch(g, { type: 'acceptContract' });
  assert(g.run.encounter?.defId === 'contract_taxman', 'accepting opens the taxman contract');

  const moralsBefore = g.run.alignment.morals;
  dispatch(g, { type: 'chooseEncounter', index: 3 }); // kick in the door (always available)
  assert(g.run.encounter?.nodeId === 'deed_alert', 'forced entry raises the alarm');
  dispatch(g, { type: 'chooseEncounter', index: 0 }); // cut him down
  assert(g.run.alignment.morals < moralsBefore, `killing shifts morals toward Evil (${moralsBefore} -> ${g.run.alignment.morals.toFixed(1)})`);
  assert(g.run.encounter?.nodeId === 'escape', 'reaches the escape node');
  dispatch(g, { type: 'chooseEncounter', index: 2 }); // simply run
  assert(g.run.encounter === null, 'encounter resolves');
  console.log('    →', alignmentName(g.run.alignment), '| alive:', g.run.alive, '| coin:', g.run.coin);
}

// 3) The [Lawful] "forged warrant" choice (the Frollo route) is gated on lawfulness.
{
  const g = newGame();
  g.run.contractAvailable = true;
  dispatch(g, { type: 'acceptContract' });
  const lawful = ENCOUNTERS['contract_taxman'].nodes['deed'].choices.find((c) => c.tag === '[Lawful]')!;
  assert(!lawful.gate!(g.run), 'the [Lawful] warrant route is shut for a Neutral wretch');
  g.run.alignment.ethics = 60;
  assert(lawful.gate!(g.run), 'it opens once the character is Lawful (Frollo can wield the law)');
}

// 4) Permadeath yields Legacy, and a new life carries meta forward.
{
  const g = newGame();
  dispatch(g, { type: 'setActivity', id: 'fell_timber' });
  let ticks = 0;
  while (g.run.alive && ticks++ < 400000) ff(g, 1); // fed, so death comes by age/illness
  assert(!g.run.alive, `character eventually dies (${g.run.deathCause}, age ${g.run.ageYears})`);
  assert(g.run.legacyThisRun > 0, `death yields Legacy (${g.run.legacyThisRun})`);
  const before = g.meta.runsCompleted;
  dispatch(g, { type: 'beginNewLife' });
  assert(g.meta.runsCompleted === before + 1, 'beginNewLife commits the life to the Guild');
  assert(g.run.alive && g.run.ageYears === 16, 'a fresh 16-year-old wretch begins');
  assert(g.meta.legacy > 0, `Legacy banked for spending (${g.meta.legacy})`);
}

// 5) Factions: labour builds Commons standing; a Chaotic soul is barred from
//    the Church (alignment gates the path).
{
  const g = newGame();
  dispatch(g, { type: 'setActivity', id: 'fell_timber' });
  ff(g, 300);
  assert(g.run.factions.commons > 0, `labour builds Commons standing (${g.run.factions.commons.toFixed(1)})`);

  const chaotic = newGame();
  chaotic.run.alignment.ethics = -80; // deeply Chaotic
  dispatch(chaotic, { type: 'setActivity', id: 'pray' });
  ff(chaotic, 200);
  assert(chaotic.run.factions.church === 0, 'a Chaotic soul earns no Church standing (path gate holds)');

  const lawful = newGame();
  lawful.run.alignment.ethics = 50; // Lawful
  dispatch(lawful, { type: 'setActivity', id: 'pray' });
  ff(lawful, 200);
  assert(lawful.run.factions.church > 0, `a Lawful soul may serve the Church (${lawful.run.factions.church.toFixed(1)})`);
}

// 6) Rank promotion is gated on coin + standing, and the command respects it.
{
  const g = newGame();
  // not yet worthy — no coin, no standing
  dispatch(g, { type: 'seekAdvancement' });
  assert(g.run.rank === 1, 'cannot advance without meeting requirements');

  g.run.coin = 15;
  g.run.factions.commons = 0;
  dispatch(g, { type: 'seekAdvancement' }); // rank 2 needs coin 15
  assert(g.run.rank === 2, 'advances to rung 2 once the cost is met');
  assert(Math.floor(g.run.coin) === 0, 'advancing SPENDS the 15 coppers it required');

  // now broke (coin 0), rung 3 needs 25 coppers → cannot advance
  dispatch(g, { type: 'seekAdvancement' });
  assert(g.run.rank === 2, 'stops at the next unmet requirement (coin)');
}

// 6b) Crossing into a new band opens a Rite of Passage, which advances on a
//     rising choice — a lived RPG-dialogue promotion.
{
  const g = newGame();
  g.run.rank = 5;
  g.run.coin = 2000;
  g.run.factions.shadow = 30;
  g.run.pockets = [{ item: 'firewood', qty: 5 }, null]; // rung 6 turn-in
  dispatch(g, { type: 'seekAdvancement' }); // rank 6 is a rite
  assert(g.run.rank === 5, 'a rite does not auto-advance — it opens an encounter');
  assert(g.run.encounter?.defId === 'rite_crossroads', "the Beggar's Crossroads rite opens");

  // pick a rising choice (index 0) → advance and mark the rite passed
  dispatch(g, { type: 'chooseEncounter', index: 0 });
  assert(g.run.rank === 6, 'the rite advances the rank on a rising choice');
  assert(g.run.milestones['rite_crossroads'] === true, 'the rite is marked as undertaken');
  assert(g.run.encounter === null, 'the rite encounter closes');
}

// 6c) From rung 4 up, advancement also requires gathered resources turned in
//     from the pockets — and consumes them. The ladder runs to 100.
{
  const g = newGame();
  g.run.rank = 15;
  g.run.milestones['rite_trial'] = true; // the rite is done
  g.run.coin = 100000;
  g.run.factions.shadow = 70; // plenty of combined standing
  dispatch(g, { type: 'seekAdvancement' }); // rung 16 needs resources we don't have
  assert(g.run.rank === 15, 'cannot rise without the required resources in hand');
  g.run.pockets = [{ item: 'roots', qty: 5 }, null]; // rung 16 turn-in
  dispatch(g, { type: 'seekAdvancement' });
  assert(g.run.rank === 16, 'with coin, standing, and turned-in resources you rise');
  assert(g.run.coin < 100000, 'advancing spent coin');
  assert(g.run.factions.shadow < 70, 'advancing spent combined standing');
  assert(g.run.pockets.reduce((n, p) => n + (p && p.item === 'roots' ? p.qty : 0), 0) < 5, 'the resources were turned in');
}

// 6d) The ladder names run from Beggar (1) to King of England (100).
{
  const g = newGame();
  g.run.rank = 1;
  assert(rankTitle(g.run) === 'Beggar', 'rank 1 is the Beggar');
  g.run.rank = 3;
  assert(rankTitle(g.run) === 'Cutpurse', 'rank 3 is the Cutpurse');
  g.run.rank = 100;
  assert(rankTitle(g.run) === 'King of England', 'rank 100 is the King of England');
}

// 7) Legacy rewards coin (1 per 1,000), longevity (1 per 2 years past 16), and
//    the climb (1 per rank above Beggar); a higher rank yields more.
{
  const { computeLegacy } = await import('../src/engine/death');
  const low = newGame();
  low.run.coin = 40;
  const high = newGame();
  high.run.coin = 40;
  high.run.rank = 8;
  assert(computeLegacy(high.run) > computeLegacy(low.run), `climbing the ladder is rewarded on death (${computeLegacy(low.run)} -> ${computeLegacy(high.run)})`);

  const rich = newGame();
  rich.run.coin = 5000;
  assert(computeLegacy(rich.run) === 5, '5,000 copper yields 5 Legacy (1 per 1,000)');
  const old = newGame();
  old.run.ageYears = 40; // 24 years past 16 → 12 Legacy
  assert(computeLegacy(old.run) === 12, '24 years past 16 yields 12 Legacy (1 per 2 years)');
  const climbed = newGame();
  climbed.run.rank = 10;
  assert(computeLegacy(climbed.run) === 9, 'rank 10 yields 9 Legacy (1 per rank above Beggar)');
}

// 8) Businesses: buying earns passive income; NO venture (even illicit) raises Heat.
{
  const g = newGame();
  g.run.coin = 100;
  dispatch(g, { type: 'investBusiness', id: 'market_stall' });
  assert(g.run.businesses['market_stall'] === 1, 'a Market Stall is acquired');
  const coinAfterBuy = g.run.coin;
  ff(g, 100);
  assert(g.run.coin > coinAfterBuy, `the stall earns passive income (${coinAfterBuy.toFixed(1)} -> ${g.run.coin.toFixed(1)})`);

  // an illicit venture requires its Base Cost + shadow standing; confirm it runs COOL
  const h = newGame();
  h.run.coin = 2500; // Fencing Den now costs 2,000 (2 shillings)
  h.run.factions.shadow = 20;
  dispatch(h, { type: 'investBusiness', id: 'fencing_den' });
  assert(h.run.businesses['fencing_den'] === 1, 'a Fencing Den is acquired once coin + shadow standing are met');
  const heatBefore = h.run.heat;
  ff(h, 200);
  assert(h.run.heat === heatBefore, `no enterprise raises Heat any more (${heatBefore} -> ${h.run.heat.toFixed(1)})`);
}

// 9) Business requirements gate acquisition (Base Cost + standing).
{
  const g = newGame();
  g.run.coin = 9999;
  dispatch(g, { type: 'investBusiness', id: 'trade_house' }); // needs a vast fortune + standing 45
  assert(!g.run.businesses['trade_house'], 'a Trade House is barred without the coin and standing to hold it');
}

// 10) The watch fines a high-Heat character (law enforcement bites).
{
  const g = newGame();
  g.run.coin = 200;
  g.run.heat = 100;
  let fined = false;
  const coin0 = g.run.coin;
  for (let i = 0; i < 400 && g.run.alive; i++) {
    Object.assign(g.run.needs, { food: 100, water: 100, comfort: 100, relief: 100 });
    g.run.illness = 'none';
    g.run.heat = 100; // keep the pressure pinned high
    advance(g);
    if (g.run.coin < coin0 || g.run.heat < 100) { fined = true; break; }
  }
  assert(fined, 'sustained max Heat draws the watch (a fine or raid occurs)');
}

// 11) The Guild: locked until rank 3, then recruit, assign, and earn — with
//     member alignment gating what work they'll take.
{
  const g = newGame();
  // locked below rank 3
  advance(g);
  assert(g.run.recruits.length === 0, 'no candidates appear before rank 3');

  g.run.rank = 4;
  advance(g); // ensureRecruits fills the pool
  assert(g.run.recruits.length === 3, 'candidates appear once the Guild is unlocked');

  // hand-craft a Lawful Good friar and confirm they refuse shadow work
  const friar = { id: 'test-friar', name: 'Brother Test', archetype: 'Friar', skill: 10, alignment: { ethics: 60, morals: 60 }, job: null, upkeep: 0.1, heat: 0 };
  g.run.members.push(friar as any);
  dispatch(g, { type: 'assignMember', memberId: 'test-friar', jobId: 'thieve' });
  assert(friar.job === null, 'a Lawful Good friar refuses to thieve (member alignment gate)');
  dispatch(g, { type: 'assignMember', memberId: 'test-friar', jobId: 'alms' });
  assert(friar.job === 'alms', 'the friar will do church almswork');

  // the assigned member earns for the Guild treasury
  g.run.coin = 100;
  const before = g.run.coin;
  ff(g, 50);
  // net of the friar's small upkeep, almswork should still add coin + church standing
  assert(g.run.factions.church > 0, `the friar builds the Guild's Church standing (${g.run.factions.church.toFixed(1)})`);
  assert(before !== g.run.coin, 'the treasury changes as the member works and is paid');
}

// 12) Roster capacity is gated by rank, and hiring respects it.
{
  const g = newGame();
  g.run.rank = 3; // cap = 1 + floor(2/2) = 2
  g.run.coin = 100000;
  advance(g);
  let hired = 0;
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = g.run.recruits[0];
    if (!r) break;
    const ok = g.run.members.length;
    dispatch(g, { type: 'recruitMember', id: r.id });
    if (g.run.members.length > ok) hired++;
    advance(g);
  }
  assert(g.run.members.length <= 2, `roster respects the rank-3 cap of 2 (has ${g.run.members.length})`);
  assert(hired >= 1, 'at least one hire succeeded');
}

// 13) Survival: unattended needs kill; eating restores food; a doctor cures.
{
  // an unfed, unwatered wretch dies of hunger or thirst
  const g = newGame();
  let ticks = 0;
  while (g.run.alive && ticks++ < 2000) advance(g);
  assert(!g.run.alive, `neglecting food and water is lethal (${g.run.deathCause})`);

  // eating restores the food need (food lives in the larder now)
  const e = newGame();
  e.run.needs.food = 20;
  e.run.larder = [{ item: 'bread', qty: 1 }, null, null, null, null, null];
  dispatch(e, { type: 'eatItem', id: 'bread' });
  assert(e.run.needs.food > 20, `eating bread restores food (20 -> ${e.run.needs.food})`);
  assert(!e.run.larder.some((p) => p && p.item === 'bread'), 'the bread is consumed');

  // a doctor lifts the plague
  const p = newGame();
  p.run.illness = 'plague';
  p.run.coin = 500;
  dispatch(p, { type: 'doDeed', id: 'see_doctor' });
  assert(p.run.illness === 'none', 'seeing a doctor cures the plague');
}

// 14) Wretched Tokens are rare, weighted, and quantised to quarters.
{
  const poor = newGame();
  poor.run.rank = 1;
  poor.run.peakCoin = 10;
  const great = newGame();
  great.run.rank = 22;
  great.run.peakCoin = 2_000_000;
  great.run.ageYears = 60;
  great.run.factions.shadow = 70;
  great.run.factions.merchants = 65;
  const t1 = computeTokens(poor.run);
  const t2 = computeTokens(great.run);
  assert(t2 > t1, `a great life earns more Tokens than a poor one (${t1} -> ${t2})`);
  assert(Math.round(t2 * 4) === t2 * 4, `Tokens are quantised to 0.25 (got ${t2})`);
  assert(t2 <= 10, `Tokens stay rare — a huge run is still under 10 (got ${t2})`);
}

// 15) Money formats into denominations (1000 copper = 1 shilling).
{
  assert(formatMoney(40) === '40c', 'small sums read in copper');
  assert(formatMoney(1250) === '1sh 250c', '1250 copper = 1 shilling 250 copper');
  assert(formatMoney(1000) === '1sh', '1000 copper rolls up to a shilling');
  assert(formatMoney(3_000_000) === '3s', 'a million copper reads in silver');
}

// 15b) Beggar → next advancement costs 15 coppers.
{
  const g = newGame();
  g.run.coin = 14;
  dispatch(g, { type: 'seekAdvancement' });
  assert(g.run.rank === 1, 'cannot advance to rung 2 with 14 coppers');
  g.run.coin = 15;
  dispatch(g, { type: 'seekAdvancement' });
  assert(g.run.rank === 2, 'advances to rung 2 with 15 coppers');
}

// 15c) The Shadow Guild offer is deferrable — reading it and slipping away keeps
//      it available; committing to an approach consumes it.
{
  const g = newGame();
  g.run.contractAvailable = true;
  dispatch(g, { type: 'acceptContract' });
  assert(g.run.encounter?.defId === 'contract_taxman', 'reading the contract opens it');
  assert(g.run.contractAvailable === true, 'the offer is NOT consumed just by reading it');

  // the "slip away — decide later" choice is the last one on the approach node
  const approach = ENCOUNTERS['contract_taxman'].nodes['approach'];
  const deferIdx = approach.choices.length - 1;
  dispatch(g, { type: 'chooseEncounter', index: deferIdx });
  assert(g.run.encounter === null, 'slipping away closes the encounter');
  assert(g.run.contractAvailable === true, 'the offer remains available to return to');

  // reopen and commit (kick the door — always available), which consumes it
  dispatch(g, { type: 'acceptContract' });
  dispatch(g, { type: 'chooseEncounter', index: 3 }); // kick in the door
  assert(g.run.contractAvailable === false, 'committing to an approach consumes the offer');
}

// 15d) Getting caught begging can land you in the stocks; you can pay 50 coppers
//      to leave, and waiting it out wrecks your needs.
{
  const g = newGame();
  // force the stocks directly (the beg roll is probabilistic)
  g.run.stocksUntil = g.run.tick + 24;
  g.run.activity = { id: 'beg', progress: 0 };
  // imprisoned: cannot start a new activity or deed
  dispatch(g, { type: 'setActivity', id: 'fell_timber' });
  assert(g.run.activity?.id === 'beg' || g.run.activity === null, 'cannot switch activities while imprisoned');

  // pay to leave
  g.run.coin = 60;
  dispatch(g, { type: 'payStocks' });
  assert(g.run.stocksUntil === null, 'paying 50 coppers frees you from the stocks');
  assert(g.run.coin === 10, 'the 50-copper fine is deducted');

  // waiting it out instead: needs are wrecked on release
  const g2 = newGame();
  g2.run.stocksUntil = g2.run.tick + 24;
  g2.run.needs.food = 90;
  g2.run.needs.water = 90;
  for (let i = 0; i < 30; i++) advance(g2); // serve the sentence, no tending
  assert(g2.run.stocksUntil === null, 'the sentence ends on its own');
  assert(g2.run.needs.food <= 12 && g2.run.needs.water <= 8, `release leaves needs wrecked (food ${g2.run.needs.food.toFixed(1)}, water ${g2.run.needs.water.toFixed(1)})`);
}

// 15e) Lay Low stops on its own once wounds are healed AND Heat is back to 0.
{
  const g = newGame();
  g.run.hp = 4; // wounded
  g.run.heat = 25;
  dispatch(g, { type: 'setActivity', id: 'laylow' });
  ff(g, 120); // fed, lay low long enough to fully recover
  assert(g.run.hp >= 12 && g.run.heat === 0, `laying low restores health and cools Heat (hp ${g.run.hp}, heat ${g.run.heat})`);
  assert(g.run.activity === null, 'Lay Low auto-cancels once fully healed and Heat is 0');
}

// 15e-2) Lay Low keeps going while a Guild member is still hot, and only stops
//        once every wretch's Heat is cool too.
{
  const g = newGame();
  g.run.hp = 12; // already fully healed
  g.run.heat = 0; // own Heat already out
  g.run.members = [
    { id: 'x', name: 'Hot', archetype: 'Thug', skill: 10, alignment: { ethics: 0, morals: -20 }, job: null, upkeep: 0, heat: 20 },
  ];
  dispatch(g, { type: 'setActivity', id: 'laylow' });
  ff(g, 6); // one cycle: the member cools 2 -> 18, still hot
  assert(g.run.activity !== null, 'Lay Low keeps going while a Guild member is still hot');
  ff(g, 120); // long enough to cool the member fully
  assert(g.run.members[0].heat === 0 && g.run.activity === null, 'Lay Low ends once every wretch is cool too');
}

// 15f) The pedlar buys pocket items; herbs are eaten for health + water.
{
  const g = newGame();
  g.run.coin = 0;
  g.run.pockets = [{ item: 'scrap', qty: 2 }, { item: 'herbs', qty: 1 }];
  dispatch(g, { type: 'sellItem', id: 'scrap' });
  assert(g.run.coin === 7, 'selling salvaged scrap yields its 7-copper value');
  assert(g.run.pockets.some((p) => p && p.item === 'scrap' && p.qty === 1), 'one scrap remains after selling one');

  g.run.hp = 6;
  g.run.needs.water = 40;
  g.run.needs.food = 50;
  dispatch(g, { type: 'eatItem', id: 'herbs' });
  assert(Math.abs(g.run.hp - 6.5) < 1e-9, `healing herbs mend half a quarter-heart (6 -> ${g.run.hp})`);
  assert(g.run.needs.food === 70, `healing herbs restore 20% food (50 -> ${g.run.needs.food})`);
  assert(g.run.needs.water === 45, `healing herbs restore 5% water (40 -> ${g.run.needs.water})`);
  assert(!g.run.pockets.some((p) => p && p.item === 'herbs'), 'the herbs are consumed');
}

// 15g) Bathing at the well can land you in the stocks (deterministic via seed).
{
  // find a seed where the first bathe attempt fails AND the escape fails
  let landed = false;
  for (let seed = 1; seed < 40 && !landed; seed++) {
    const g = newGame();
    g.run.seed = seed;
    g.run.rngCursor = 0;
    dispatch(g, { type: 'doDeed', id: 'bathe_well' });
    if (g.run.stocksUntil !== null) landed = true;
  }
  assert(landed, 'a failed bathe + failed escape lands the player in the stocks');
}

// 15h) Seeking warmth banishes the cold and grants a full day's immunity.
{
  const g = newGame();
  g.run.needs.comfort = 20;
  dispatch(g, { type: 'doDeed', id: 'seek_warmth' });
  assert(g.run.needs.comfort === 100, 'seeking warmth fully restores comfort');
  assert(g.run.warmUntil > g.run.tick, 'seeking warmth grants a warmth window');
  const window = g.run.warmUntil - g.run.tick;
  assert(window >= 20 && window <= 24, `the warmth lasts about a day (${window} ticks)`);

  // even in deep winter, comfort does not fall while warm
  g.run.tick = 0;
  g.run.warmUntil = 100;
  // force a cold tick by putting us at a winter/night point isn't easy; instead
  // verify the guard directly: with warm active, a cold check never drains.
  const before = g.run.needs.comfort;
  for (let i = 0; i < 10; i++) advance(g);
  assert(g.run.needs.comfort >= before - 0.01, `comfort does not drop from cold while warm (${before} -> ${g.run.needs.comfort})`);
}

// 15i) Pockets: two slots, each stacking up to 5 of one kind.
{
  const g = newGame();
  g.run.pockets = [null, null];
  addItem(g.run, 'firewood', 5);
  assert(countItem(g.run, 'firewood') === 5, 'a slot stacks up to 5');
  addItem(g.run, 'firewood', 5); // fills the second slot
  assert(countItem(g.run, 'firewood') === 10, 'a second slot holds another stack of 5');
  const ok = addItem(g.run, 'firewood', 3); // no room — lost
  assert(!ok && countItem(g.run, 'firewood') === 10, `overflow beyond two stacks of ${MAX_STACK} is lost`);
}

// 15j) Firewood makes a campfire (fast warmth); frying a river fish with oil
//      produces a cooked (or occasionally burnt) fish and builds Cooking.
{
  const g = newGame();
  g.run.pockets = [{ item: 'firewood', qty: 2 }, { item: 'fish', qty: 1 }];
  g.run.needs.comfort = 10;
  const fire0 = g.run.skills['firemaking'];
  dispatch(g, { type: 'doDeed', id: 'make_campfire' });
  assert(g.run.needs.comfort === 100 && g.run.warmUntil > g.run.tick, 'a campfire warms you and grants the warmth window');
  assert(countItem(g.run, 'firewood') === 1, 'the campfire burns one firewood');
  assert(g.run.skills['firemaking'] > fire0, 'making a fire builds Firemaking');

  // cooking needs a fish AND a goblet of cooking oil, and your Cooking skill
  // decides the outcome. A successful cook raises the skill; keep at it until one
  // lands. (Start at a middling skill so a success is reasonably quick.)
  g.run.pockets = [null, null, null, null];
  g.run.skills['cooking'] = 50;
  const cookStart = g.run.skills['cooking'];
  let everProduced = false;
  for (let n = 0; n < 200 && g.run.skills['cooking'] <= cookStart; n++) {
    if (countItem(g.run, 'fish') < 1) addItem(g.run, 'fish', 1);
    if (countItem(g.run, 'cooking_oil') < 1) addItem(g.run, 'cooking_oil', 1);
    dispatch(g, { type: 'doDeed', id: 'cook_fish' });
    if (countItem(g.run, 'cooked_fish') + countItem(g.run, 'burnt_fish') > 0) everProduced = true;
    // clear any produced dish so there is always room to cook again
    for (let i = 0; i < g.run.pockets.length; i++) {
      const p = g.run.pockets[i];
      if (p && (p.item === 'cooked_fish' || p.item === 'burnt_fish')) g.run.pockets[i] = null;
    }
  }
  assert(g.run.skills['cooking'] > cookStart, `a successful cook builds the Cooking skill (now ${g.run.skills['cooking'].toFixed(0)})`);
  assert(everProduced, 'cooking produces a dish (cooked or burnt)');

  // raw river fish is no longer edible; the cooked one is
  const raw = itemDef('fish')!;
  const cooked = itemDef('cooked_fish')!;
  assert(!isEdible(raw), 'a raw river fish cannot be eaten');
  assert(isEdible(cooked) && cooked.value === 7 && raw.value === 3, 'cooked fish (7c) is worth more than raw (3c)');
}

// 15j-2) A market stall at level 3+ can drop treats while you work it.
{
  const g = newGame();
  g.run.businesses = { market_stall: 30 };
  dispatch(g, { type: 'setActivity', id: 'work_market_stall' });
  let treats = 0;
  for (let n = 0; n < 400; n++) {
    ff(g, 7); // one stall cycle
    treats =
      countItem(g.run, 'pastry') +
      countItem(g.run, 'cake') +
      countItem(g.run, 'fried_fish') +
      countItem(g.run, 'chicken_curry') +
      countItem(g.run, 'health_potion');
    // keep pockets clear so drops keep landing
    if (treats > 0) break;
  }
  assert(treats > 0, 'a high-level market stall drops food while worked');
}

// 15j-3) The wandering merchant sells carry upgrades gated by coin + faction.
{
  const { carryOffers, canBuyCarry, buyCarryUpgrade } = await import('../src/engine/merchant');
  const { inventoryCapacity } = await import('../src/engine/items');
  const g = newGame();
  const cap0 = inventoryCapacity(g.run);
  const pocket = carryOffers(g.run).find((o) => o.kind === 'pocket')!;
  g.run.coin = 0;
  g.run.factions.commons = 0;
  assert(!canBuyCarry(g.run, pocket), 'a third pocket is barred without coin or standing');
  g.run.coin = pocket.cost;
  g.run.factions.commons = pocket.factionReq;
  assert(canBuyCarry(g.run, pocket), 'with the coin and standing, the pocket is buyable');
  assert(buyCarryUpgrade(g.run, 'pocket'), 'buying the pocket succeeds');
  assert(inventoryCapacity(g.run) === cap0 + 1, 'a bought pocket adds one carry slot');
  assert(g.run.pockets.length === cap0 + 1, 'the new slot is real and empty');
}

// 15k) Honest Labour occasionally raises Brawn (10% chance, +0.1–0.4 each).
{
  const g = newGame();
  const before = g.run.attrs.brawn;
  dispatch(g, { type: 'setActivity', id: 'fell_timber' });
  ff(g, 8 * 60); // many labour cycles — a gain becomes near-certain
  const gain = g.run.attrs.brawn - before;
  assert(gain > 0, `honest labour builds brawn over time (${gain.toFixed(3)})`);
  assert(g.run.attrs.brawn <= 100, `brawn is capped at 100 (${g.run.attrs.brawn.toFixed(1)})`);
}

// 15l) Serving at the Chapel can raise Good (morals), not Lawful.
{
  const g = newGame();
  g.run.alignment.ethics = 50; // Lawful, so the Church admits us
  dispatch(g, { type: 'setActivity', id: 'pray' });
  const ethics0 = g.run.alignment.ethics;
  ff(g, 400); // serve for a good while
  assert(g.run.alignment.morals > 0, `serving the Church raises Good over time (morals ${g.run.alignment.morals.toFixed(2)})`);
  // it should NOT be pushing ethics upward the way the old version did
  assert(g.run.alignment.ethics <= ethics0 + 0.5, 'serving no longer steadily raises Lawful');
}

// 16) Determinism — same seed + same commands reproduce identical state.
{
  const play = (seed: number): string => {
    const g = newGame();
    g.run.seed = seed;
    g.run.rngCursor = 0;
    dispatch(g, { type: 'setActivity', id: 'pickpocket' });
    ff(g, 300);
    return `${g.run.coin}|${g.run.heat}|${g.run.health}`;
  };
  assert(play(12345) === play(12345), 'the same seed reproduces identical state');
}

// 17) Contract roster: a killed mark is gone for good; a spared mark returns,
//     and choices only nudge alignment a little (the slow burn).
{
  const g = newGame();
  g.run.contractAvailable = true;
  g.run.contractTargetId = 'contract_taxman';
  dispatch(g, { type: 'acceptContract' });
  const approach = ENCOUNTERS['contract_taxman'].nodes['approach'];
  const bribeIdx = approach.choices.findIndex((c) => c.tag === '[20 coppers]');
  g.run.coin = 100;
  dispatch(g, { type: 'chooseEncounter', index: bribeIdx }); // → deed (a bribe: slow burn)
  const moralsAfterBribe = g.run.alignment.morals;
  dispatch(g, { type: 'chooseEncounter', index: 1 }); // blade — a killing (Evil +1–3)
  const kill = moralsAfterBribe - g.run.alignment.morals;
  assert(kill >= 0.9 && kill <= 3.1, `a killing grows Evil hard, by ~1–3 (Δmorals ${kill.toFixed(2)})`);
  assert(g.run.contractFates['contract_taxman'] === 'dead', 'killing a mark records it dead');

  // dead marks are never offered again
  const { eligibleTargets } = await import('../src/engine/contracts');
  assert(!eligibleTargets(g.run).some((t) => t.id === 'contract_taxman'), 'a dead mark leaves the roster for good');
}

// 17b) Sparing a mark leaves it alive and still robbable.
{
  const g = newGame();
  g.run.contractAvailable = true;
  g.run.contractTargetId = 'contract_taxman';
  dispatch(g, { type: 'acceptContract' });
  g.run.attrs.stealth = 8;
  const approach = ENCOUNTERS['contract_taxman'].nodes['approach'];
  dispatch(g, { type: 'chooseEncounter', index: 0 }); // slip over the wall
  // may go to deed or deed_alert; get to a node with a Spare option
  let node = g.run.encounter?.nodeId;
  if (node === 'deed_alert') {
    // no spare here — restart cleanly with a bribe route instead
    const g2 = newGame();
    g2.run.contractAvailable = true;
    g2.run.contractTargetId = 'contract_taxman';
    g2.run.coin = 100;
    dispatch(g2, { type: 'acceptContract' });
    const bribeIdx = approach.choices.findIndex((c) => c.tag === '[20 coppers]');
    dispatch(g2, { type: 'chooseEncounter', index: bribeIdx });
    const deed = ENCOUNTERS['contract_taxman'].nodes['deed'];
    const spareIdx = deed.choices.findIndex((c) => c.tag === '[Good]');
    dispatch(g2, { type: 'chooseEncounter', index: spareIdx });
    assert(g2.run.contractFates['contract_taxman'] === 'spared', 'sparing a mark records it spared');
    const { eligibleTargets } = await import('../src/engine/contracts');
    assert(eligibleTargets(g2.run).some((t) => t.id === 'contract_taxman'), 'a spared mark can be robbed again');
  } else {
    const deed = ENCOUNTERS['contract_taxman'].nodes['deed'];
    const spareIdx = deed.choices.findIndex((c) => c.tag === '[Good]');
    dispatch(g, { type: 'chooseEncounter', index: spareIdx });
    assert(g.run.contractFates['contract_taxman'] === 'spared', 'sparing a mark records it spared');
    const { eligibleTargets } = await import('../src/engine/contracts');
    assert(eligibleTargets(g.run).some((t) => t.id === 'contract_taxman'), 'a spared mark can be robbed again');
  }
}

// 17c) The Guild pays for the kill, not the getaway: a successful contract pays
//      the full promised fee (the "melt into the night → only 20 of 40" bug).
{
  const g = newGame();
  g.run.contractAvailable = true;
  g.run.contractTargetId = 'contract_taxman';
  g.run.coin = 100;
  g.run.attrs.stealth = 40; // a clean, certain escape
  g.run.heat = 0;
  dispatch(g, { type: 'acceptContract' });
  const approach = ENCOUNTERS['contract_taxman'].nodes['approach'];
  const bribeIdx = approach.choices.findIndex((c) => c.tag === '[20 coppers]');
  const coinAfterBribe = 100 - 20;
  dispatch(g, { type: 'chooseEncounter', index: bribeIdx }); // → deed (coin 80)
  dispatch(g, { type: 'chooseEncounter', index: 1 }); // blade → escape
  const before = g.run.coin;
  dispatch(g, { type: 'chooseEncounter', index: 0 }); // melt into the night
  assert(before === coinAfterBribe, `bribe cost 20 before the deed (coin ${before})`);
  assert(g.run.coin - before === 40, `melting into the night pays the full 40-copper fee (+${g.run.coin - before})`);
}

// 18) Skills are hidden until discovered; the cook burn-curve is monotonic.
{
  const { cookRoll, isDiscovered } = await import('../src/engine/skills');
  const g = newGame();
  assert(!isDiscovered(g.run, 'cooking'), 'an untouched skill is undiscovered (hidden)');
  g.run.skills['cooking'] = 5;
  assert(isDiscovered(g.run, 'cooking'), 'a used skill becomes discovered');

  // at skill 100 a cook can never burn or fail
  g.run.skills['cooking'] = 100;
  let allCooked = true;
  for (let i = 0; i < 50; i++) if (cookRoll(g.run, 'cooking') !== 'cooked') allCooked = false;
  assert(allCooked, 'at Cooking 100 every dish comes out right (no burns)');

  // at skill 0 a cook succeeds only very rarely — a 0.5% floor, not zero
  g.run.skills['cooking'] = 0;
  let successes = 0;
  const trials = 6000;
  for (let i = 0; i < trials; i++) if (cookRoll(g.run, 'cooking') === 'cooked') successes++;
  assert(successes > 0, 'at Cooking 0 a dish can still, rarely, come out right (0.5% floor)');
  assert(successes < trials * 0.05, `at Cooking 0 success is rare, ~0.5% (got ${(100 * successes / trials).toFixed(2)}%)`);
}

// 19) Enterprises: the market stall can only be worked once owned, and working
//     it out-earns the same base by its ×(1.5+0.5·level) multiplier.
{
  const g = newGame();
  dispatch(g, { type: 'setActivity', id: 'work_market_stall' });
  assert(g.run.activity === null, 'you cannot work a market stall you do not own');

  g.run.businesses = { market_stall: 3 }; // ×3 yield at level 3
  dispatch(g, { type: 'setActivity', id: 'work_market_stall' });
  assert(g.run.activity?.id === 'work_market_stall', 'an owned stall can be worked');
  const before = g.run.coin;
  ff(g, 7); // one work cycle
  assert(g.run.coin > before, `working the owned stall earns coin (${before.toFixed(0)} -> ${g.run.coin.toFixed(0)})`);
}

// 20) Owning any enterprise ends the begging life.
{
  const { ownsAnyBusiness } = await import('../src/engine/businesses');
  const g = newGame();
  assert(!ownsAnyBusiness(g.run), 'a fresh wretch owns nothing');
  dispatch(g, { type: 'setActivity', id: 'beg' });
  assert(g.run.activity?.id === 'beg', 'the pauper may beg');
  g.run.businesses = { market_stall: 1 };
  assert(ownsAnyBusiness(g.run), 'buying an enterprise is remembered');
  dispatch(g, { type: 'setActivity', id: null }); // stop begging
  dispatch(g, { type: 'setActivity', id: 'beg' }); // and try to beg again
  assert(g.run.activity?.id !== 'beg', 'once you own an enterprise you can no longer choose to beg');
}

// 21) The patch-note odometer counts up from v0.0.1-alpha.
{
  const { versionForOrdinal } = await import('../src/ui/patchNotes');
  assert(versionForOrdinal(1) === 'v0.0.1-alpha', 'the first patch is v0.0.1-alpha');
  assert(versionForOrdinal(9) === 'v0.0.9-alpha', 'the ninth is v0.0.9-alpha');
  assert(versionForOrdinal(10) === 'v0.1.0-alpha', '0.0.9 rolls to v0.1.0-alpha');
  assert(versionForOrdinal(999) === 'v0.99.9-alpha', 'the 999th is v0.99.9-alpha');
  assert(versionForOrdinal(1000) === 'v1.0.0-alpha', '0.99.9 rolls to v1.0.0-alpha');
}

// 22) Leveled meta-unlocks: each level costs the next rung of the ladder and
//     stacks its effect into every future life.
{
  const { newRun } = await import('../src/engine/state');
  const g = newGame();
  g.meta.legacy = 100000;

  // Hardened Stock: +1 heart per level, ladder 8, 50, 300, …
  dispatch(g, { type: 'buyUnlock', id: 'hardened' });
  assert(g.meta.unlocks['hardened'] === 1, 'buying Hardened Stock reaches level 1');
  assert(g.meta.legacy === 100000 - 8, 'level 1 costs 8 Legacy');
  dispatch(g, { type: 'buyUnlock', id: 'hardened' });
  assert(g.meta.unlocks['hardened'] === 2, 'a second purchase reaches level 2');
  assert(g.meta.legacy === 100000 - 8 - 50, 'level 2 costs the next rung, 50 Legacy');
  const bornHard = newRun(g.meta);
  assert(bornHard.heartsBonus === 2, 'two levels of Hardened Stock grant +2 hearts at birth');

  // Beggar's Luck: +2 Luck per level (plus the kept-Legacy Luck bonus)
  const h = newGame();
  h.meta.legacy = 4; // exactly the cost of three levels, so nothing is kept
  dispatch(h, { type: 'buyUnlock', id: 'beggars_luck' }); // level 1, cost 1
  dispatch(h, { type: 'buyUnlock', id: 'beggars_luck' }); // level 2, cost 1
  dispatch(h, { type: 'buyUnlock', id: 'beggars_luck' }); // level 3, cost 2
  assert(h.meta.unlocks['beggars_luck'] === 3, "Beggar's Luck climbs to level 3");
  assert(h.meta.legacy === 0, 'the ladder charges 1, 1, 2 Legacy');
  const bornLucky = newRun(h.meta);
  assert(bornLucky.attrs.luck === 6, 'three levels of +2 Luck begin life at Luck 6 (no Legacy kept)');

  // kept Legacy adds to Luck: every 10 held = 1% = 0.1 on the Luck attribute
  h.meta.legacy = 50; // 5 × 10 Legacy → +0.5 Luck, on top of the +6 from the unlock
  assert(Math.abs(newRun(h.meta).attrs.luck - 6.5) < 1e-9, '50 kept Legacy adds +0.5 Luck at birth (5 × 0.1)');

  // A Coin in the Lining: 15 copper per level, and levels are infinite
  const c = newGame();
  c.meta.legacy = 10000;
  dispatch(c, { type: 'buyUnlock', id: 'stashed_coin' });
  assert(c.meta.unlocks['stashed_coin'] === 1, 'A Coin in the Lining is bought');
  assert(newRun(c.meta).coin === 15, 'level 1 passes each new wretch 15 copper');
  dispatch(c, { type: 'buyUnlock', id: 'stashed_coin' });
  dispatch(c, { type: 'buyUnlock', id: 'stashed_coin' });
  assert(c.meta.unlocks['stashed_coin'] === 3, 'levels are infinite — you can keep buying');
  assert(newRun(c.meta).coin === 45, 'three levels pass 45 copper at birth');
}

// 22b) Unlock levels are infinite: cost keeps climbing past the ladder's end.
{
  const { unlockById, unlockCost } = await import('../src/engine/unlocks');
  const hardened = unlockById('hardened')!;
  const ladder = hardened.costs.length; // 7 rungs
  assert(unlockCost(hardened, 0) === hardened.costs[0], 'within the ladder, cost is the listed rung');
  const beyond1 = unlockCost(hardened, ladder); // first level past the ladder
  const beyond2 = unlockCost(hardened, ladder + 1);
  assert(beyond1 > hardened.costs[ladder - 1], 'past the ladder the cost keeps climbing');
  assert(beyond2 > beyond1, 'and it climbs further with each level (infinite)');
}

// 22c) Spoils are banked at death, so they are spendable on the death screen.
{
  const g = newGame();
  g.run.rank = 8;
  g.run.coin = 800;
  const legacyBefore = g.meta.legacy;
  // kill the wretch outright
  const { die } = await import('../src/engine/death');
  die(g, g.run, 'slain for the test');
  assert(!g.run.alive, 'the wretch is dead');
  assert(g.meta.legacy > legacyBefore, 'Legacy is banked into meta at the moment of death');
  // and can be spent immediately (before beginning a new life)
  const spendable = g.meta.legacy;
  dispatch(g, { type: 'buyUnlock', id: 'stashed_coin' });
  assert(g.meta.legacy < spendable, 'the freshly-earned Legacy can be spent on the death screen');
  // beginning a new life does NOT re-bank (no double credit)
  const runsBefore = g.meta.runsCompleted;
  const metaLegacy = g.meta.legacy;
  dispatch(g, { type: 'beginNewLife' });
  assert(g.meta.runsCompleted === runsBefore + 1, 'a new life bumps the run count');
  assert(g.meta.legacy === metaLegacy, 'no double-banking of Legacy on the new life');
}

// 23) The day/night clock is a SEPARATE 6-minute timer from the fast sim ticks.
{
  const { REAL_MS_PER_TICK, DAY_LENGTH_MS, HOUR_LENGTH_MS, START_HOUR } = await import('../src/engine/timeconst');
  const { hourOfDay } = await import('../src/engine/time');
  assert(REAL_MS_PER_TICK === 2000, 'the sim tick stays fast (2s) so growth is quick');
  assert(DAY_LENGTH_MS === 360000, 'a full day/night cycle is 6 real minutes');
  assert(HOUR_LENGTH_MS === 15000, 'an hour of the day is 15 real seconds');

  // the hour is derived from the real-time dayMs clock, not from ticks
  const g = newGame();
  assert(hourOfDay(g.run) === START_HOUR, 'a new life begins at 8 in the morning');
  g.run.dayMs = 13 * HOUR_LENGTH_MS; // 1 pm
  assert(hourOfDay(g.run) === 13, 'the hour follows the dayMs clock');
  g.run.dayMs = DAY_LENGTH_MS + 3 * HOUR_LENGTH_MS; // next day, 3 am
  assert(hourOfDay(g.run) === 3, 'the clock wraps to the next day');

  // advancing sim ticks does NOT move the day/night clock
  const before = g.run.dayMs;
  ff(g, 100);
  assert(g.run.dayMs === before, 'sim ticks leave the day/night clock untouched (separate timers)');
}

// 24) The wandering merchant stays until dismissed, then wanders back later.
{
  const g = newGame();
  // fast-forward (kept fed) until the merchant arrives
  let guard = 0;
  while (!g.run.merchantHere && guard++ < 100000) ff(g, 1);
  assert(g.run.merchantHere, 'a wandering merchant eventually arrives');

  // it does NOT leave on its own over time
  ff(g, 500);
  assert(g.run.merchantHere, 'the merchant lingers indefinitely (no auto-departure)');

  // dismissing sends them off
  dispatch(g, { type: 'dismissMerchant' });
  assert(!g.run.merchantHere, 'clicking Leave sends the merchant away');

  // and they come back another day
  guard = 0;
  while (!g.run.merchantHere && guard++ < 100000) ff(g, 1);
  assert(g.run.merchantHere, 'the merchant wanders back later');
}

// 25) Deeds stay hidden until they apply; coin activities show earnings but
//     never reveal what they train.
{
  const { DEEDS } = await import('../src/engine/deeds');
  const { ACTIVITIES } = await import('../src/engine/activities');
  const byId = (id: string) => DEEDS.find((d) => d.id === id)!;

  const g = newGame();
  g.run.pockets = [null, null];
  g.run.illness = 'none';

  // Cook a Fish is hidden with no fish, revealed once you hold one
  assert(byId('cook_fish').reveal!(g.run) === false, 'Cook a River Fish is hidden without a fish');
  addItem(g.run, 'fish', 1);
  assert(byId('cook_fish').reveal!(g.run) === true, 'Cook a River Fish appears once you hold a fish');

  // Bake a Potato likewise
  assert(byId('bake_potato').reveal!(g.run) === false, 'Bake a Potato is hidden without a potato');
  addItem(g.run, 'potato', 1);
  assert(byId('bake_potato').reveal!(g.run) === true, 'Bake a Potato appears once you hold a potato');

  // See a Doctor only when sick
  assert(byId('see_doctor').reveal!(g.run) === false, 'See a Doctor is hidden while healthy');
  g.run.illness = 'fever';
  assert(byId('see_doctor').reveal!(g.run) === true, 'See a Doctor appears when sick');

  // coin activities carry an earnings tag; none of the blurbs leak their attribute
  const labour = ACTIVITIES.find((a) => a.id === 'fell_timber')!;
  assert(labour.earns === '3–5c', 'Fell Timber shows its 3–5c earnings');
  assert(ACTIVITIES.find((a) => a.id === 'pickpocket')!.earns === '1–5c', 'Pick Pockets shows its earnings');
  const leaks = ACTIVITIES.filter((a) => /\b(Brawn|Wits|Charm|Stealth|Piety|Luck|skill)\b/i.test(a.blurb));
  assert(leaks.length === 0, `no activity blurb reveals what it trains (leaks: ${leaks.map((a) => a.id).join(', ')})`);
}

// 26) A killing shifts Evil hard (1–3), while lesser wicked choices stay a slow
//     burn (0.1–0.4) — and working an owned enterprise out-earns idle income.
{
  // killing: the blade at the deed node drops morals by ~1–3
  const g = newGame();
  g.run.contractAvailable = true;
  g.run.contractTargetId = 'contract_taxman';
  g.run.coin = 100;
  dispatch(g, { type: 'acceptContract' });
  const approach = ENCOUNTERS['contract_taxman'].nodes['approach'];
  const bribeIdx = approach.choices.findIndex((c) => c.tag === '[20 coppers]');
  dispatch(g, { type: 'chooseEncounter', index: bribeIdx }); // → deed (a bribe: slow burn)
  const moralsAfterBribe = g.run.alignment.morals;
  dispatch(g, { type: 'chooseEncounter', index: 1 }); // blade — a killing
  const evilFromKill = moralsAfterBribe - g.run.alignment.morals;
  assert(evilFromKill >= 0.9 && evilFromKill <= 3.1, `a killing grows Evil by ~1–3 (Δ ${evilFromKill.toFixed(2)})`);

  // the bribe alone (a lesser wicked choice) is a slow burn
  const g2 = newGame();
  g2.run.contractAvailable = true;
  g2.run.contractTargetId = 'contract_taxman';
  g2.run.coin = 100;
  dispatch(g2, { type: 'acceptContract' });
  const m0 = g2.run.alignment.morals;
  dispatch(g2, { type: 'chooseEncounter', index: bribeIdx });
  const bribeEvil = m0 - g2.run.alignment.morals;
  assert(bribeEvil > 0 && bribeEvil < 0.5, `a bribe is only a slow-burn nudge (Δ ${bribeEvil.toFixed(2)})`);

  // working an owned enterprise reports more coin/tick than idle alone
  const { workCoinPerTick, businessById } = await import('../src/engine/businesses');
  const stall = businessById('market_stall')!;
  assert(workCoinPerTick(stall, 0) === 0, 'an unowned stall pays nothing to work');
  assert(workCoinPerTick(stall, 1) > 0, 'working an owned stall adds coin/tick on top of idle income');
  assert(workCoinPerTick(stall, 2) > workCoinPerTick(stall, 1), 'a higher-level stall pays more per tick worked');
}

// 27) Beginning a new life wipes the previous wretch's Chronicle.
{
  const g = newGame();
  dispatch(g, { type: 'setActivity', id: 'beg' });
  ff(g, 60); // pile up some log entries
  assert(g.log.length > 1, 'a life accrues Chronicle entries');
  const { die } = await import('../src/engine/death');
  die(g, g.run, 'slain for the test');
  dispatch(g, { type: 'beginNewLife' });
  assert(g.log.length === 1, 'a new life starts with a fresh, single-entry Chronicle');
  assert(g.log[0].text.includes('new wretch'), 'and that entry is the new wretch\'s opening line');
}

// 28) A new life fully resets the run (needs at 100%, pockets back to base),
//     while meta (Legacy/Tokens/unlocks/vault) carries over.
{
  const { inventoryCapacity } = await import('../src/engine/items');
  const g = newGame();
  // wreck the run: drain needs and expand carry capacity
  Object.assign(g.run.needs, { food: 10, water: 5, comfort: 8, hygiene: 3, relief: 0 });
  g.run.pocketSlots = 6;
  g.run.pouches = 6;
  g.run.container = 3;
  g.meta.legacy = 200; // meta that should survive
  const before = inventoryCapacity(g.run);
  assert(before > 2, 'the wretch had expanded carry capacity');

  const { die } = await import('../src/engine/death');
  die(g, g.run, 'slain for the test');
  dispatch(g, { type: 'beginNewLife' });

  assert(g.run.needs.food === 100 && g.run.needs.water === 100 && g.run.needs.comfort === 100 && g.run.needs.hygiene === 100 && g.run.needs.relief === 100, 'a new life begins with all needs at 100%');
  assert(g.run.pocketSlots === 2 && g.run.pouches === 0 && g.run.container === 0, 'pockets/pouches/container reset to base');
  assert(inventoryCapacity(g.run) === 2, 'carry capacity resets to two pockets');
  assert(g.meta.legacy > 0, 'meta Legacy carries over (only meta survives a death)');
}

// 29) A new life starts paused, and a paused game does not advance in the
//     background (offline catch-up is skipped while paused).
{
  const { catchUpOffline } = await import('../src/engine/save');
  const g = newGame();
  const { die } = await import('../src/engine/death');
  die(g, g.run, 'slain for the test');
  dispatch(g, { type: 'beginNewLife' });
  assert(g.paused === true, 'a new life begins paused');

  // simulate a long absence while paused — no ticks should elapse
  const tickBefore = g.run.tick;
  g.lastSavedAt = Date.now() - 60 * 60 * 1000; // an hour ago
  catchUpOffline(g);
  assert(g.run.tick === tickBefore, 'a paused game does not tick in the background');

  // once unpaused, the same absence does advance time
  g.paused = false;
  g.lastSavedAt = Date.now() - 60 * 60 * 1000;
  catchUpOffline(g);
  assert(g.run.tick > tickBefore, 'an unpaused game catches up on background time');
}

// 30) Random town events spring up and resolve on a valid choice.
{
  const { EVENTS } = await import('../src/engine/events');
  assert(EVENTS.length >= 6, `there is a variety of events (${EVENTS.length})`);
  assert(EVENTS.some((e) => e.id === 'event_harvest') && EVENTS.some((e) => e.id === 'event_chapel_bell') && EVENTS.some((e) => e.id === 'event_unguarded_stall'), 'events span farming, worship, and stealing');

  const g = newGame();
  g.run.eventCooldown = 1;
  advanceTick(g); // 1 → 0 → an event springs up
  assert(g.run.encounter !== null && g.run.encounter.defId.startsWith('event_'), 'a random event springs up when its timer runs out');

  const enc = g.run.encounter!;
  const node = ENCOUNTERS[enc.defId].nodes[enc.nodeId];
  const idx = node.choices.findIndex((c) => !c.gate || c.gate(g.run));
  dispatch(g, { type: 'chooseEncounter', index: idx });
  assert(g.run.encounter === null, 'choosing a valid option resolves the event');
  assert(g.run.eventCooldown > 1, 'the next event is scheduled for later');
}

// 31) Contract fees scale with rank; a level-1 stall drops food while worked.
{
  const { contractById, contractPay } = await import('../src/engine/contracts');
  const osric = contractById('contract_taxman')!;
  assert(contractPay(osric, 1) === osric.pay, 'at rank 1 a contract pays its base fee');
  assert(contractPay(osric, 10) > contractPay(osric, 1), 'a higher rank is worth more than rank 1');
  assert(contractPay(osric, 50) > contractPay(osric, 10), 'and it keeps climbing with rank');

  const g = newGame();
  g.run.businesses = { market_stall: 1 }; // pastry now drops from level 1 (10%)
  dispatch(g, { type: 'setActivity', id: 'work_market_stall' });
  let got = 0;
  for (let n = 0; n < 800; n++) {
    ff(g, 7);
    got = countItem(g.run, 'pastry');
    if (got > 0) break;
  }
  assert(got > 0, 'a level-1 market stall can drop a pastry while worked');
}

// 32) Food routes to the six-slot larder; ingredients (goods) stay in pockets;
//     and cooking teaches on a burn, double on a success.
{
  const { slotsFor, LARDER_SLOTS, countItem } = await import('../src/engine/items');
  const g = newGame();
  g.run.larder = [null, null, null, null, null, null];
  g.run.pockets = [null, null];
  assert(LARDER_SLOTS === 6, 'the larder has six slots');

  addItem(g.run, 'bread', 1); // food → larder
  addItem(g.run, 'cooking_oil', 1); // goods → pockets
  addItem(g.run, 'fish', 1); // raw fish (a food ingredient) → larder
  assert(g.run.larder.some((p) => p && p.item === 'bread'), 'food goes to the larder');
  assert(g.run.larder.some((p) => p && p.item === 'fish'), 'raw fish (to be cooked) goes to the larder too');
  assert(g.run.pockets.some((p) => p && p.item === 'cooking_oil'), 'ingredients like oil stay in the pockets');
  assert(slotsFor(g.run, 'bread') === g.run.larder && slotsFor(g.run, 'firewood') === g.run.pockets, 'slotsFor routes food to larder, goods to pockets');
  assert(countItem(g.run, 'bread') === 1, 'countItem sees the larder');

  // a full purse of ingredients no longer blocks cooking: fish (larder) + oil (pockets)
  g.run.pockets = [{ item: 'firewood', qty: 5 }, { item: 'cooking_oil', qty: 1 }]; // pockets full of goods
  addItem(g.run, 'fish', 1);
  g.run.skills['cooking'] = 90; // at 90: 90% cooked / 10% burnt / 0% fail — always teaches
  const before = g.run.skills['cooking'];
  dispatch(g, { type: 'doDeed', id: 'cook_fish' });
  // a burn teaches +1, a success teaches +2 — either way the skill rises
  const gained = g.run.skills['cooking'] - before;
  assert(gained === 1 || gained === 2, `cooking teaches (+1 on a burn, +2 on a success): got +${gained}`);
  assert(g.run.pockets.some((p) => p && p.item === 'firewood'), 'a full purse of goods no longer blocks cooking');
}

// 33) Laying Low cools your Guild members' Heat (2 per cycle), and time now
//     flows even while an encounter is open (the player can leave it).
{
  const g = newGame();
  g.run.members = [
    { id: 'm1', name: 'Cutter', archetype: 'Thug', skill: 10, alignment: { ethics: 0, morals: -20 }, job: null, upkeep: 0, heat: 10 },
    { id: 'm2', name: 'Mouse', archetype: 'Sneak', skill: 8, alignment: { ethics: -20, morals: -10 }, job: null, upkeep: 0, heat: 0 },
  ];
  g.run.heat = 30;
  dispatch(g, { type: 'setActivity', id: 'laylow' });
  ff(g, 6); // one Lay Low cycle
  assert(g.run.members[0].heat <= 8, `laying low cools a member's Heat by 2 (10 -> ${g.run.members[0].heat})`);
  assert(g.run.members[1].heat === 0, 'a member with no Heat stays at 0 (never negative)');

  // sworn members stay put no matter how long wages go unpaid — only their own
  // Heat boiling to 100 (or the player's hand) ever forces one out.
  {
    const gg = newGame();
    gg.run.rank = 3;
    gg.run.coin = 0;
    gg.run.members = [
      { id: 'a', name: 'Poorpaid', archetype: 'Tough', skill: 10, alignment: { ethics: 0, morals: -20 }, job: null, upkeep: 5, heat: 40 },
      { id: 'b', name: 'Boiling', archetype: 'Thug', skill: 10, alignment: { ethics: 0, morals: -20 }, job: null, upkeep: 5, heat: 100 },
    ];
    processGuild(gg, gg.run);
    assert(gg.run.members.some((m) => m.id === 'a'), 'an unpaid member below boiling Heat is NOT removed');
    assert(!gg.run.members.some((m) => m.id === 'b'), 'a member at 100 Heat is seized by the watch');
    // and the player can always dismiss by hand
    dispatch(gg, { type: 'dismissMember', id: 'a' });
    assert(gg.run.members.length === 0, 'the player can dismiss a sworn member by hand');
  }

  // time flows with an encounter open
  const h = newGame();
  h.run.contractAvailable = true;
  h.run.contractTargetId = 'contract_taxman';
  dispatch(h, { type: 'acceptContract' });
  assert(h.run.encounter !== null, 'a contract encounter is open');
  const t0 = h.run.tick;
  advanceTick(h);
  assert(h.run.tick === t0 + 1, 'the clock keeps ticking with an encounter open (no pause)');
}

// 34) The Hunter trade needs a bow (bought from the merchant); the bow, warm
//     clothes, and a larger waterskin are merchant gear; hunted game is roasted.
{
  const { gearOffers, buyGear, canBuyGear } = await import('../src/engine/merchant');
  const { itemDef } = await import('../src/engine/items');

  // hunting is barred without a bow
  const g = newGame();
  dispatch(g, { type: 'setActivity', id: 'hunt' });
  assert(g.run.activity === null, 'you cannot hunt without a bow');

  // buy the bow (150c), warm clothes (80c), and a larger waterskin from the merchant
  g.run.coin = 1000;
  const bow = gearOffers(g.run).find((o) => o.kind === 'bow')!;
  assert(bow.cost === 150, 'a hunting bow costs 150 copper');
  assert(buyGear(g.run, 'bow'), 'the bow is bought');
  assert(g.run.hasBow, 'the bow is owned');
  assert(buyGear(g.run, 'warm_clothes') && g.run.warmClothes, 'warm woollens are bought');
  const skin0 = g.run.waterskinMax;
  assert(buyGear(g.run, 'waterskin') && g.run.waterskinMax === skin0 + 2, 'a larger waterskin adds 2 charges');
  assert(!canBuyGear(g.run, gearOffers(g.run).find((o) => o.kind === 'warm_clothes')!), 'warm clothes cannot be bought twice');

  // now hunting works and yields game (raw beasts, which are food-larder items)
  dispatch(g, { type: 'setActivity', id: 'hunt' });
  assert(g.run.activity?.id === 'hunt', 'with a bow, the Hunter trade is open');
  let bagged = 0;
  for (let n = 0; n < 400; n++) {
    ff(g, 8);
    bagged = ['raw_weasel', 'raw_rabbit', 'raw_boar', 'raw_sheep', 'raw_goat', 'raw_deer', 'raw_elk'].reduce((s, id) => s + countItem(g.run, id), 0);
    if (bagged > 0) break;
  }
  assert(bagged > 0, 'hunting eventually brings down game');

  // Elk is the rarest and richest; Weasel the commonest and cheapest
  assert(itemDef('raw_elk')!.value === 300 && itemDef('raw_weasel')!.value === 11, 'Elk is worth 300c, Weasel 11c');
  assert(itemDef('roast_elk')!.food === 65 && itemDef('roast_weasel')!.food === 5, 'roast Elk heals 65% food, roast Weasel 5%');

  // roast a beast with oil
  g.run.larder = [{ item: 'raw_rabbit', qty: 1 }, null, null, null, null, null];
  g.run.pockets = [{ item: 'cooking_oil', qty: 1 }, null];
  g.run.skills['cooking'] = 100; // guarantee success
  dispatch(g, { type: 'doDeed', id: 'cook_game' });
  assert(countItem(g.run, 'roast_rabbit') === 1 && countItem(g.run, 'raw_rabbit') === 0, 'a rabbit is roasted with oil into food');
}

// 35) The All-Weather Hat (1 shilling) wards off BOTH heat and cold.
{
  const { gearOffers, buyGear, canBuyGear } = await import('../src/engine/merchant');
  const h = newGame();
  h.run.coin = 1000;
  const hat = gearOffers(h.run).find((o) => o.kind === 'hat')!;
  assert(hat.cost === 1000, 'the all-weather hat costs 1 shilling (1000c)');
  assert(buyGear(h.run, 'hat') && h.run.weatherproof, 'the hat is bought and makes you weatherproof');
  assert(!canBuyGear(h.run, gearOffers(h.run).find((o) => o.kind === 'hat')!), 'the hat cannot be bought twice');
  // in the swelter of a summer day (tick 80), comfort still recovers with the hat on
  h.run.tick = 80;
  h.run.needs.comfort = 50;
  for (let i = 0; i < 10; i++) advance(h);
  assert(h.run.needs.comfort > 50, `the hat keeps comfort rising even in heat (50 -> ${h.run.needs.comfort.toFixed(1)})`);
}

// 36) Dev god mode: needs freeze full, no harm can land, and death is disabled.
{
  const { maxHp } = await import('../src/engine/survival');
  const g = newGame();
  g.settings = { ...g.settings, godMode: true };
  g.run.needs.food = 0;
  g.run.needs.water = 0;
  g.run.needs.comfort = 0;
  g.run.needs.hygiene = 0;
  g.run.hp = 1;
  g.run.illness = 'plague';
  for (let i = 0; i < 300; i++) advance(g);
  assert(g.run.alive, 'god mode: the wretch cannot die');
  assert(g.run.needs.food === 100 && g.run.needs.water === 100 && g.run.needs.comfort === 100, 'god mode: body functions stay full');
  assert(g.run.illness === 'none', 'god mode: illness is banished');
  assert(g.run.hp >= maxHp(g.run) - 0.001, 'god mode: hearts pinned to the max');
}

// 37) Dev toggles: "never gain Heat" and "fast cards" (one-tick cycles).
{
  const g = newGame();
  g.settings = { ...g.settings, noHeat: true };
  g.run.heat = 100;
  advance(g);
  assert(g.run.heat === 0, 'no-heat: Heat is pinned to 0 each tick');

  const { ACTIVITIES } = await import('../src/engine/activities');
  const safe = ['beg', 'fell_timber', 'coal_mine', 'till_fields', 'forage', 'fish', 'scavenge'];
  const multi = ACTIVITIES.find((a) => (a.ticks ?? 1) > 1 && safe.includes(a.id))!;
  const f = newGame();
  f.settings = { ...f.settings, fastCards: true };
  dispatch(f, { type: 'setActivity', id: multi.id });
  advance(f);
  assert(f.run.activity?.progress === 0, `fast cards: a ${multi.ticks}-tick card (${multi.id}) completes in one tick`);

  // dev rank buttons: rank up one at a time on demand, and reset back to 1
  const r = newGame();
  const rank0 = r.run.rank;
  dispatch(r, { type: 'devRankUp' });
  assert(r.run.rank === rank0 + 1, `dev rank up: rose from ${rank0} to ${r.run.rank}, cost-free and rite-free`);
  for (let i = 0; i < 20; i++) dispatch(r, { type: 'devRankUp' });
  assert(r.run.rank === rank0 + 21, 'dev rank up climbs one rung per press');
  dispatch(r, { type: 'devResetRank' });
  assert(r.run.rank === 1, 'dev reset rank returns the wretch to rank 1');

  // free advancement: with the dev flag, requirements read as met and Seek
  // Advancement rises a rank at no cost.
  const { advancement } = await import('../src/engine/ranks');
  const a = newGame();
  a.run.rank = 1;
  a.run.coin = 0;
  assert(!advancement(a.run).eligible, 'without resources you are not eligible normally');
  assert(advancement(a.run, true).eligible, 'free advancement makes you eligible');
  a.settings = { ...a.settings, freeAdvance: true };
  dispatch(a, { type: 'seekAdvancement' });
  assert(a.run.rank === 2 && a.run.coin === 0, 'free advancement: Seek Advancement rises a rank, spending nothing');
}

// 38) The wandering merchant stops coming once every ware is bought.
{
  const { merchantSoldOut } = await import('../src/engine/merchant');
  const { MAX_POCKETS, MAX_POUCHES, MAX_CONTAINER } = await import('../src/engine/items');
  const g = newGame();
  g.run.pocketSlots = MAX_POCKETS;
  g.run.pouches = MAX_POUCHES;
  g.run.container = MAX_CONTAINER;
  g.run.waterskinMax = 12; // MAX_WATERSKIN
  g.run.warmClothes = true;
  g.run.weatherproof = true;
  g.run.hasBow = true;
  assert(merchantSoldOut(g.run), 'the merchant is sold out once every ware is owned');
  // set up the arrival window (shop hours, cooldown ready) and confirm none comes
  g.run.merchantHere = false;
  g.run.merchantCooldown = 1;
  g.run.dayMs = 10 * 15000; // 10am — within shop hours
  for (let i = 0; i < 50; i++) advance(g);
  assert(!g.run.merchantHere, 'a sold-out merchant is never sent into town');
}

// 39) The Chalice of Infinite Oil buff lets you cook with no physical Goblet.
{
  const { hasCookingOil } = await import('../src/engine/deeds');
  const g = newGame();
  g.run.oilBuffMs = 3600_000; // buffed for an hour
  g.run.larder = [{ item: 'raw_rabbit', qty: 1 }, null, null, null, null, null];
  g.run.pockets = [null, null]; // NO cooking oil at all
  g.run.skills['cooking'] = 100; // guarantee a success
  assert(hasCookingOil(g.run), 'the Chalice supplies cooking oil while buffed');
  dispatch(g, { type: 'doDeed', id: 'cook_game' });
  assert(
    countItem(g.run, 'roast_rabbit') === 1 && countItem(g.run, 'raw_rabbit') === 0,
    'buffed cooking roasts the beast with no Goblet of Oil in the pockets',
  );

  // once the buff runs out, cooking needs the real thing again
  g.run.oilBuffMs = 0;
  assert(!hasCookingOil(g.run), 'without the buff and without a Goblet, there is no oil to cook with');
}

console.log(failures === 0 ? '\n=== ALL ENGINE TESTS PASSED ===' : `\n=== ${failures} FAILURE(S) ===`);
process.exit(failures === 0 ? 0 : 1);
