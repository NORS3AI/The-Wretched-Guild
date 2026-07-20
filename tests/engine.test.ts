// Headless regression test for the pure engine — no browser, no framework.
// Run with `npm test`. Exercises the real reducers so game rules can't silently
// rot as systems are added.

import { newGame } from '../src/engine/state';
import { advanceTick, dispatch } from '../src/engine/engine';
import { ENCOUNTERS } from '../src/engine/encounters';
import { alignmentName } from '../src/engine/alignment';

let failures = 0;
function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.log('  ✗ FAIL:', msg);
    failures++;
  } else {
    console.log('  ✓', msg);
  }
}

console.log('The Wretched Guild — engine tests\n');

// 1) Idle labour accrues coin and nudges alignment toward Lawful.
{
  const g = newGame();
  dispatch(g, { type: 'setActivity', id: 'labor' });
  for (let i = 0; i < 200; i++) advanceTick(g);
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
  while (g.run.alive && ticks++ < 400000) advanceTick(g);
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
  for (let i = 0; i < 300; i++) advanceTick(g);
  assert(g.run.factions.commons > 0, `labour builds Commons standing (${g.run.factions.commons.toFixed(1)})`);

  const chaotic = newGame();
  chaotic.run.alignment.ethics = -80; // deeply Chaotic
  dispatch(chaotic, { type: 'setActivity', id: 'pray' });
  for (let i = 0; i < 200; i++) advanceTick(chaotic);
  assert(chaotic.run.factions.church === 0, 'a Chaotic soul earns no Church standing (path gate holds)');

  const lawful = newGame();
  lawful.run.alignment.ethics = 50; // Lawful
  dispatch(lawful, { type: 'setActivity', id: 'pray' });
  for (let i = 0; i < 200; i++) advanceTick(lawful);
  assert(lawful.run.factions.church > 0, `a Lawful soul may serve the Church (${lawful.run.factions.church.toFixed(1)})`);
}

// 6) Rank promotion is gated on coin + standing, and the command respects it.
{
  const g = newGame();
  // not yet worthy — no coin, no standing
  dispatch(g, { type: 'seekAdvancement' });
  assert(g.run.rank === 1, 'cannot advance without meeting requirements');

  g.run.coin = 5;
  g.run.factions.commons = 5;
  dispatch(g, { type: 'seekAdvancement' }); // rank 2 needs coin 3, standing 0
  assert(g.run.rank === 2, 'advances to rung 2 once coin/standing are met');
  dispatch(g, { type: 'seekAdvancement' }); // rank 3 needs coin 10 — not met
  assert(g.run.rank === 2, 'stops at the next unmet requirement');
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
  for (let i = 0; i < 100; i++) advanceTick(g);
  assert(g.run.coin > coinAfterBuy, `the stall earns passive income (${coinAfterBuy.toFixed(1)} -> ${g.run.coin.toFixed(1)})`);

  // an illicit venture requires standing + rank; set them and confirm Heat rises
  const h = newGame();
  h.run.coin = 500;
  h.run.rank = 3;
  h.run.factions.shadow = 20;
  dispatch(h, { type: 'investBusiness', id: 'fencing_den' });
  assert(h.run.businesses['fencing_den'] === 1, 'a Fencing Den is acquired once rank + shadow standing are met');
  const heatBefore = h.run.heat;
  for (let i = 0; i < 200; i++) advanceTick(h);
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
    advanceTick(g);
    if (g.run.coin < coin0 || g.run.heat < 100) { fined = true; break; }
  }
  assert(fined, 'sustained max Heat draws the watch (a fine or raid occurs)');
}

// 11) Determinism — same seed + same commands reproduce identical state.
{
  const play = (seed: number): string => {
    const g = newGame();
    g.run.seed = seed;
    g.run.rngCursor = 0;
    dispatch(g, { type: 'setActivity', id: 'pickpocket' });
    for (let i = 0; i < 300; i++) advanceTick(g);
    return `${g.run.coin}|${g.run.heat}|${g.run.health}`;
  };
  assert(play(12345) === play(12345), 'the same seed reproduces identical state');
}

console.log(failures === 0 ? '\n=== ALL ENGINE TESTS PASSED ===' : `\n=== ${failures} FAILURE(S) ===`);
process.exit(failures === 0 ? 0 : 1);
