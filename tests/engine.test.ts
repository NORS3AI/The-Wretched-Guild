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

// 5) Determinism — same seed + same commands reproduce identical state.
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
