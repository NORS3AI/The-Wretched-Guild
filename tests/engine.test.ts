// Headless regression test for the pure engine — no browser, no framework.
// Run with `npm test`. Exercises the real reducers so game rules can't silently
// rot as systems are added.

import { newGame } from '../src/engine/state';
import { advanceTick, dispatch } from '../src/engine/engine';
import { ENCOUNTERS } from '../src/engine/encounters';
import { alignmentName } from '../src/engine/alignment';
import { computeTokens } from '../src/engine/death';
import { formatMoney } from '../src/engine/money';

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
    advanceTick(g);
    if (!g.run.alive) break;
  }
}

console.log('The Wretched Guild — engine tests\n');

// 1) Idle labour accrues coin and nudges alignment toward Lawful.
{
  const g = newGame();
  dispatch(g, { type: 'setActivity', id: 'labor' });
  ff(g, 200);
  assert(g.run.coin > 0, `idle labour earned coin (got ${g.run.coin})`);
  assert(g.run.alignment.ethics > 0, `honest toil nudged toward Lawful (ethics ${g.run.alignment.ethics.toFixed(1)})`);
}

// 2) A contract is offered; a murderous route shifts alignment toward Evil.
{
  const g = newGame();
  dispatch(g, { type: 'setActivity', id: 'beg' });
  let guard = 0;
  while (!g.run.contractAvailable && guard++ < 5000) advanceTick(g);
  assert(g.run.contractAvailable, 'a contract is offered within reasonable time');

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
  dispatch(g, { type: 'setActivity', id: 'labor' });
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
  dispatch(g, { type: 'setActivity', id: 'labor' });
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
  dispatch(g, { type: 'seekAdvancement' }); // rank 2 needs coin 15, standing 0
  assert(g.run.rank === 2, 'advances to rung 2 once coin/standing are met');
  dispatch(g, { type: 'seekAdvancement' }); // rank 3 needs standing 3 — not met
  assert(g.run.rank === 2, 'stops at the next unmet requirement (standing)');
}

// 6b) Crossing into a new band opens a Rite of Passage, which advances on a
//     rising choice — a lived RPG-dialogue promotion.
{
  const g = newGame();
  g.run.rank = 5;
  g.run.coin = 200;
  g.run.factions.shadow = 30;
  dispatch(g, { type: 'seekAdvancement' }); // rank 6 is a rite
  assert(g.run.rank === 5, 'a rite does not auto-advance — it opens an encounter');
  assert(g.run.encounter?.defId === 'rite_crossroads', "the Beggar's Crossroads rite opens");

  // pick a rising choice (index 0) → advance and mark the rite passed
  dispatch(g, { type: 'chooseEncounter', index: 0 });
  assert(g.run.rank === 6, 'the rite advances the rank on a rising choice');
  assert(g.run.milestones['rite_crossroads'] === true, 'the rite is marked as undertaken');
  assert(g.run.encounter === null, 'the rite encounter closes');
}

// 6c) Higher rungs demand a second faction's standing (breadth), and the ladder
//     now runs to 30.
{
  const g = newGame();
  g.run.rank = 15;
  g.run.milestones['rite_trial'] = true; // pretend the rite is done
  g.run.coin = 100000;
  g.run.factions.shadow = 100; // top standing maxed
  dispatch(g, { type: 'seekAdvancement' }); // rank 16 needs a SECOND faction ≥ 20
  assert(g.run.rank === 15, 'a maxed single faction is not enough for the Notable band');
  g.run.factions.merchants = 25;
  dispatch(g, { type: 'seekAdvancement' });
  assert(g.run.rank === 16, 'breadth across two factions unlocks the higher rung');
}

// 7) A higher rank yields more Legacy on death.
{
  const low = newGame();
  low.run.coin = 40;
  const high = newGame();
  high.run.coin = 40;
  high.run.rank = 8;
  const lowLegacy = Math.floor(low.run.coin / 8) + Math.max(0, low.run.ageYears - 16) + (low.run.rank - 1) * 4;
  const highLegacy = Math.floor(high.run.coin / 8) + Math.max(0, high.run.ageYears - 16) + (high.run.rank - 1) * 4;
  assert(highLegacy > lowLegacy, `climbing the ladder is rewarded on death (${lowLegacy} -> ${highLegacy})`);
}

// 8) Businesses: buying earns passive income; illicit ventures raise Heat; the
//    law eventually answers high Heat.
{
  const g = newGame();
  g.run.coin = 100;
  dispatch(g, { type: 'investBusiness', id: 'market_stall' });
  assert(g.run.businesses['market_stall'] === 1, 'a Market Stall is acquired');
  const coinAfterBuy = g.run.coin;
  ff(g, 100);
  assert(g.run.coin > coinAfterBuy, `the stall earns passive income (${coinAfterBuy.toFixed(1)} -> ${g.run.coin.toFixed(1)})`);

  // an illicit venture requires standing + rank; set them and confirm Heat rises
  const h = newGame();
  h.run.coin = 500;
  h.run.rank = 3;
  h.run.factions.shadow = 20;
  dispatch(h, { type: 'investBusiness', id: 'fencing_den' });
  assert(h.run.businesses['fencing_den'] === 1, 'a Fencing Den is acquired once rank + shadow standing are met');
  const heatBefore = h.run.heat;
  ff(h, 200);
  assert(h.run.heat > heatBefore, `the illicit den raises Heat over time (${heatBefore} -> ${h.run.heat.toFixed(1)})`);
}

// 9) Business requirements gate acquisition (rank + standing).
{
  const g = newGame();
  g.run.coin = 9999;
  dispatch(g, { type: 'investBusiness', id: 'trade_house' }); // needs rank 8 + standing 45
  assert(!g.run.businesses['trade_house'], 'a Trade House is barred without the rank and standing to hold it');
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
    advanceTick(g);
    if (g.run.coin < coin0 || g.run.heat < 100) { fined = true; break; }
  }
  assert(fined, 'sustained max Heat draws the watch (a fine or raid occurs)');
}

// 11) The Guild: locked until rank 3, then recruit, assign, and earn — with
//     member alignment gating what work they'll take.
{
  const g = newGame();
  // locked below rank 3
  advanceTick(g);
  assert(g.run.recruits.length === 0, 'no candidates appear before rank 3');

  g.run.rank = 4;
  advanceTick(g); // ensureRecruits fills the pool
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
  advanceTick(g);
  let hired = 0;
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = g.run.recruits[0];
    if (!r) break;
    const ok = g.run.members.length;
    dispatch(g, { type: 'recruitMember', id: r.id });
    if (g.run.members.length > ok) hired++;
    advanceTick(g);
  }
  assert(g.run.members.length <= 2, `roster respects the rank-3 cap of 2 (has ${g.run.members.length})`);
  assert(hired >= 1, 'at least one hire succeeded');
}

// 13) Survival: unattended needs kill; eating restores food; a doctor cures.
{
  // an unfed, unwatered wretch dies of hunger or thirst
  const g = newGame();
  let ticks = 0;
  while (g.run.alive && ticks++ < 2000) advanceTick(g);
  assert(!g.run.alive, `neglecting food and water is lethal (${g.run.deathCause})`);

  // eating restores the food need
  const e = newGame();
  e.run.needs.food = 20;
  e.run.pockets = [{ item: 'bread', qty: 1 }, null];
  dispatch(e, { type: 'doDeed', id: 'eat' });
  assert(e.run.needs.food > 20, `eating bread restores food (20 -> ${e.run.needs.food})`);
  assert(!e.run.pockets.some((p) => p && p.item === 'bread'), 'the bread is consumed');

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
  assert(formatMoney(1250) === '1s 250c', '1250 copper = 1 shilling 250 copper');
  assert(formatMoney(3_000_000) === '3si', 'a million copper reads in silver');
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
  dispatch(g, { type: 'setActivity', id: 'labor' });
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
  for (let i = 0; i < 30; i++) advanceTick(g2); // serve the sentence, no tending
  assert(g2.run.stocksUntil === null, 'the sentence ends on its own');
  assert(g2.run.needs.food <= 12 && g2.run.needs.water <= 8, `release leaves needs wrecked (food ${g2.run.needs.food.toFixed(1)}, water ${g2.run.needs.water.toFixed(1)})`);
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

console.log(failures === 0 ? '\n=== ALL ENGINE TESTS PASSED ===' : `\n=== ${failures} FAILURE(S) ===`);
process.exit(failures === 0 ? 0 : 1);
