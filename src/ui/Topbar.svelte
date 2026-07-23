<script lang="ts">
  import { gameStore, actions, settingsOpen, bearingOpen, legacyOpen, purseOpen } from './game';
  import { currentDay, TICKS_PER_DAY } from '../engine/engine';
  import { alignmentName, ethicsBand, moralsBand } from '../engine/alignment';
  import { maxHp, QUARTERS_PER_HEART } from '../engine/survival';
  import { formatMoney, wealthLadder } from '../engine/money';
  import { hourOfDay, formatClock, dayPart } from '../engine/time';
  import heartsUrl from '../assets/hearts.png';

  const game = gameStore;

  const speeds = [1, 2, 4, 10];

  const partIcon = { night: '🌙', dawn: '🌅', day: '☀️', dusk: '🌆' } as const;
  $: hour = hourOfDay($game.run);
  $: part = dayPart($game.run);

  // hearts as sprites (moved here from The Wretch): each heart has 5 phases
  // (full → empty); the sprite column is 4 − quarters, the row flips green when
  // poisoned/afflicted.
  $: poisoned = $game.run.illness !== 'none';
  $: heartPhases = (() => {
    const hearts = Math.round(maxHp($game.run) / QUARTERS_PER_HEART);
    const cols: number[] = [];
    for (let i = 0; i < hearts; i++) {
      const q = Math.max(0, Math.min(QUARTERS_PER_HEART, Math.round($game.run.hp - i * QUARTERS_PER_HEART)));
      cols.push(QUARTERS_PER_HEART - q); // 0 = full … 4 = empty
    }
    return cols;
  })();
  $: heartText = ($game.run.hp / QUARTERS_PER_HEART).toFixed(2).replace(/\.00$/, '');

  // map an alignment axis value [-100,100] -> [0,100] for a centered bar
  function axisPct(v: number): number {
    return (v + 100) / 2;
  }

  // The wealth ladder, shown top-down from the loftiest coin to the humble copper.
  // It lists ONLY what the purse has actually reached plus the single next goal
  // above it — no greyed-out rungs. Because only the next goal is ever shown, the
  // lofty gem denominations (amethyst → diamond) reveal themselves ONE AT A TIME:
  // amethyst first appears as the next goal only once platinum has been reached,
  // then topaz once amethyst is reached, and so on up to the diamond.
  $: fullLadder = wealthLadder($game.run.coin).slice().reverse();
  $: nextGoal = fullLadder.filter((r) => !r.reached).at(-1)?.name ?? null;
  $: ladder = fullLadder.filter((r) => r.reached || r.name === nextGoal);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  function seasonOf(day: number): string {
    const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
    const perYear = TICKS_PER_DAY * 12; // days per year = 12
    const dayOfYear = (day - 1) % 12;
    return seasons[Math.floor(dayOfYear / 3) % 4];
  }
</script>

<div class="topbar panel">
  <div class="stat">
    <span class="label">Day</span>
    <span class="val">{currentDay($game.run)}</span>
    <span class="sub faint">{seasonOf(currentDay($game.run))}</span>
  </div>
  <div class="stat">
    <span class="label">Hour</span>
    <span class="val clock" class:night={part === 'night'}>{partIcon[part]} {formatClock(hour)}</span>
    <span class="sub faint">{part}</span>
  </div>
  <div class="stat">
    <span class="label">Age</span>
    <span class="val">{$game.run.ageYears}</span>
  </div>
  <div class="row-break"></div>
  <div class="stat purse-stat">
    <span class="label">Purse</span>
    <button class="val gold purse-btn" title="See the coin of the realm" onclick={() => purseOpen.update((v) => !v)}>
      {formatMoney($game.run.coin)}
      <span class="caret">{$purseOpen ? '▴' : '▾'}</span>
    </button>
    {#if $purseOpen}
      <div class="purse-pop">
        <div class="pop-title">The Coin of the Realm</div>
        <div class="pop-sub faint">You hold {formatMoney($game.run.coin)} · {Math.floor($game.run.coin)} copper</div>
        <div class="ladder">
          {#each ladder as rung}
            <div class="rung" class:reached={rung.reached} class:next={rung.name === nextGoal}>
              <div class="rung-main">
                <span class="rung-name">{cap(rung.name)}</span>
                <span class="rung-worth faint">
                  {#if rung.below}= 1,000 {rung.below}{:else}the base coin{/if}
                </span>
              </div>
              <span class="rung-status">
                {#if rung.reached}
                  <span class="have">{rung.have}{rung.short}</span>
                {:else if rung.name === nextGoal}
                  <span class="goal">next goal</span>
                {/if}
              </span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
  <div class="row-break"></div>
  <div class="stat">
    <span class="label">Heat</span>
    <span class="val" class:hot={$game.run.heat > 60}>{Math.round($game.run.heat)}</span>
  </div>
  <div class="stat hearts-stat">
    <span class="label">Hearts</span>
    <div class="hearts" class:starving={$game.run.needs.food <= 0} title="{heartText} / {heartPhases.length}{$game.run.illness !== 'none' ? ` · ${$game.run.illness}` : ''}">
      {#each heartPhases as col}
        <div
          class="sprite heart-sprite"
          style="background-image:url({heartsUrl}); background-position:{col * 25}% {poisoned ? 100 : 0}%"
        ></div>
      {/each}
    </div>
  </div>
  <div class="stat wide bearing-stat">
    <span class="label">Bearing</span>
    <button
      class="val align bearing-btn"
      title="See your true bearing"
      onclick={() => bearingOpen.update((v) => !v)}
    >
      {alignmentName($game.run.alignment)}
      <span class="caret">{$bearingOpen ? '▴' : '▾'}</span>
    </button>
    {#if $bearingOpen}
      <div class="bearing-pop">
        <div class="axis">
          <div class="axis-ends"><span>Chaotic</span><span class="tag">{ethicsBand($game.run.alignment)}</span><span>Lawful</span></div>
          <div class="axbar">
            <div class="tick"></div>
            <div class="marker" style="left:{axisPct($game.run.alignment.ethics)}%"></div>
          </div>
        </div>
        <div class="axis">
          <div class="axis-ends"><span>Evil</span><span class="tag">{moralsBand($game.run.alignment)}</span><span>Good</span></div>
          <div class="axbar">
            <div class="tick"></div>
            <div class="marker" style="left:{axisPct($game.run.alignment.morals)}%"></div>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <div class="spacer"></div>

  <div class="controls">
    <button class="btn legacy-btn" title="The Guild's Ledger — your Legacy, Tokens, and Luck" onclick={() => legacyOpen.set(true)}>
      ⚜ Legacy
    </button>
    <button
      class="btn"
      onclick={() => actions.togglePause()}
      title="Pause / resume time"
    >
      {$game.paused ? '▶ Resume' : '❚❚ Pause'}
    </button>
    {#each speeds as s}
      <button
        class="btn speed"
        class:active={!$game.paused && $game.speed === s}
        onclick={() => actions.setSpeed(s)}
      >
        {s}×
      </button>
    {/each}
    <button class="btn gear" title="Settings" onclick={() => settingsOpen.set(true)}>⚙</button>
  </div>
</div>

<style>
  .topbar {
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 10px 16px;
    margin-top: 6px;
    flex-wrap: wrap;
  }
  .stat {
    display: flex;
    flex-direction: column;
    line-height: 1.1;
    min-width: 48px;
  }
  .stat.wide {
    min-width: 130px;
  }
  .bearing-stat,
  .purse-stat {
    position: relative;
  }
  .label {
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--ink-faint);
  }
  .val {
    font-size: 1.15rem;
    font-weight: 600;
  }
  .val.gold {
    color: var(--gold-bright);
  }
  /* Purse value is a button revealing the wealth ladder */
  .purse-btn {
    font-family: inherit;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    padding: 1px 5px;
    margin-left: -5px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    transition: border-color 0.15s;
  }
  .purse-btn:hover {
    border-color: var(--gold);
  }
  .purse-btn {
    font-variant-numeric: tabular-nums;
  }
  .purse-btn .caret {
    font-size: 0.7rem;
    color: var(--ink-faint);
    font-weight: 400;
  }
  /* On phones the topbar wraps; give the Purse its own fixed line so its
     constantly-changing value never bumps other stats between rows (which was
     making the whole bar jitter up and down as coin ticked in). */
  .row-break {
    display: none;
  }
  @media (max-width: 700px) {
    .row-break {
      display: block;
      flex-basis: 100%;
      width: 100%;
      height: 0;
    }
  }
  .purse-pop {
    position: absolute;
    top: 100%;
    right: 0; /* anchor to the right so it never spills off a narrow screen */
    margin-top: 6px;
    z-index: 60;
    width: 250px;
    max-width: calc(100vw - 20px);
    max-height: 360px;
    overflow-y: auto;
    background: var(--bg-panel);
    border: 1px solid var(--gold);
    border-radius: 6px;
    padding: 10px 4px 8px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.55);
  }
  .pop-title {
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--gold);
    padding: 0 8px;
  }
  .pop-sub {
    font-size: 0.72rem;
    padding: 2px 8px 8px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 4px;
  }
  .ladder {
    display: flex;
    flex-direction: column;
  }
  .rung {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 5px 8px;
    border-radius: 4px;
  }
  .rung.reached {
    background: rgba(201, 162, 39, 0.08);
  }
  .rung.next {
    background: rgba(201, 162, 39, 0.14);
    outline: 1px solid var(--border-light);
  }
  .rung-main {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
    min-width: 0;
  }
  .rung-name {
    font-size: 0.86rem;
    color: var(--ink-faint);
  }
  .rung.reached .rung-name {
    color: var(--gold-bright);
    font-weight: 600;
  }
  .rung.next .rung-name {
    color: var(--ink);
  }
  .rung-worth {
    font-size: 0.66rem;
  }
  .rung-status {
    font-size: 0.74rem;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .rung-status .have {
    color: var(--gold);
  }
  .rung-status .goal {
    color: var(--ink);
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .val.align {
    font-size: 0.98rem;
    color: var(--ink);
  }
  /* hearts strip in the topbar */
  .hearts {
    display: flex;
    gap: 2px;
    padding: 2px;
    border: 1px solid transparent;
    border-radius: 4px;
  }
  .hearts.starving {
    border-color: var(--blood-bright);
    animation: starvepulse 1s ease-in-out infinite;
  }
  @keyframes starvepulse {
    0%,
    100% {
      box-shadow: 0 0 0 0 rgba(200, 40, 30, 0);
    }
    50% {
      box-shadow: 0 0 7px 2px rgba(200, 40, 30, 0.7);
    }
  }
  .heart-sprite {
    width: 18px;
    height: 21px; /* sprite cell aspect 66:80 */
    background-size: 500% 200%; /* 5 phases × 2 colours */
    background-repeat: no-repeat;
    image-rendering: pixelated;
    flex-shrink: 0;
  }
  /* the Bearing value is now a button revealing the alignment axes */
  .bearing-btn {
    font-family: inherit;
    background: transparent;
    border: 1px solid var(--border-light);
    border-radius: 4px;
    padding: 2px 8px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    transition: border-color 0.15s, color 0.15s;
  }
  .bearing-btn:hover {
    border-color: var(--gold);
    color: var(--gold-bright);
  }
  .bearing-btn .caret {
    font-size: 0.7rem;
    color: var(--ink-faint);
  }
  .bearing-pop {
    position: absolute;
    top: 100%;
    right: 0; /* anchor right so it stays on-screen on mobile */
    margin-top: 6px;
    z-index: 60;
    width: 220px;
    max-width: calc(100vw - 20px);
    background: var(--bg-panel);
    border: 1px solid var(--gold);
    border-radius: 6px;
    padding: 12px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.55);
  }
  .axis {
    margin-bottom: 10px;
  }
  .axis:last-child {
    margin-bottom: 0;
  }
  .axis-ends {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.66rem;
    color: var(--ink-faint);
    margin-bottom: 3px;
  }
  .axis-ends .tag {
    color: var(--ink);
    font-size: 0.7rem;
    letter-spacing: 0.05em;
  }
  .axbar {
    position: relative;
    height: 10px;
    border: 1px solid var(--border);
    border-radius: 5px;
    overflow: visible;
    background: linear-gradient(90deg, #2a1414, #0f0b07 50%, #16220f);
  }
  .tick {
    position: absolute;
    left: 50%;
    top: -2px;
    bottom: -2px;
    width: 1px;
    background: var(--border-light);
  }
  .marker {
    position: absolute;
    top: 50%;
    width: 9px;
    height: 9px;
    background: var(--gold-bright);
    border: 1px solid #0f0b07;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    transition: left 0.4s ease;
    box-shadow: 0 0 5px rgba(232, 195, 74, 0.6);
  }
  .val.clock {
    font-size: 0.95rem;
    white-space: nowrap;
  }
  .val.clock.night {
    color: #8ea3c8;
  }
  .val.hot {
    color: var(--blood-bright);
  }
  .sub {
    font-size: 0.62rem;
  }
  .spacer {
    flex: 1;
  }
  .controls {
    display: flex;
    gap: 6px;
  }
  .btn.speed {
    padding: 6px 9px;
    min-width: 38px;
  }
  .btn.speed.active {
    border-color: var(--gold);
    color: var(--gold-bright);
    background: rgba(201, 162, 39, 0.12);
  }
  .btn.gear {
    padding: 6px 9px;
    font-size: 0.95rem;
  }
  .btn.legacy-btn {
    color: var(--gold);
  }
  .btn.legacy-btn:hover {
    border-color: var(--gold);
    color: var(--gold-bright);
  }
</style>
