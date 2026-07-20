<script lang="ts">
  import { gameStore, actions } from './game';
  import { currentDay, TICKS_PER_DAY } from '../engine/engine';
  import { alignmentName } from '../engine/alignment';
  import { formatMoney } from '../engine/money';

  const game = gameStore;

  const speeds = [1, 2, 4];

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
    <span class="label">Age</span>
    <span class="val">{$game.run.ageYears}</span>
  </div>
  <div class="stat">
    <span class="label">Purse</span>
    <span class="val gold">{formatMoney($game.run.coin)}</span>
  </div>
  <div class="stat">
    <span class="label">Heat</span>
    <span class="val" class:hot={$game.run.heat > 60}>{Math.round($game.run.heat)}</span>
  </div>
  <div class="stat wide">
    <span class="label">Bearing</span>
    <span class="val align">{alignmentName($game.run.alignment)}</span>
  </div>

  <div class="spacer"></div>

  <div class="controls">
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
  .val.align {
    font-size: 0.98rem;
    color: var(--ink);
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
</style>
