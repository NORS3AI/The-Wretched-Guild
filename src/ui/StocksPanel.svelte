<script lang="ts">
  import { gameStore, actions } from './game';
  import { TICKS_PER_DAY } from '../engine/timeconst';

  const game = gameStore;
  $: run = $game.run;
  $: remaining = run.stocksUntil !== null ? Math.max(0, run.stocksUntil - run.tick) : 0;
  $: served = TICKS_PER_DAY - remaining;
  $: pct = Math.max(0, Math.min(100, (served / TICKS_PER_DAY) * 100));
  $: hours = remaining; // 1 tick ≈ 1 in-game hour
  $: canPay = run.coin >= 50;
</script>

<div class="panel stocks">
  <div class="panel-title">Locked in the Stocks</div>
  <div class="body">
    <p class="flavour">
      Head and hands clamped in oak, you kneel in the square while the town jeers and
      pelts you with filth. You cannot eat, drink, wash, or work — and by the time
      they let you out, you will be in a wretched state indeed.
    </p>

    <div class="time">
      <div class="time-head">
        <span>Sentence</span>
        <span class="muted">~{hours} hour{hours === 1 ? '' : 's'} left</span>
      </div>
      <div class="bar"><div class="fill" style="width:{pct}%"></div></div>
    </div>

    <button class="btn primary pay" disabled={!canPay} onclick={() => actions.payStocks()}>
      {canPay ? 'Pay 50 coppers to be let go early' : 'Pay 50 coppers (you cannot afford it)'}
    </button>
    <p class="hint faint">
      Paying spares you the worst of the ordeal; waiting it out leaves you filthy,
      starving, and parched.
    </p>
  </div>
</div>

<style>
  .stocks {
    border-color: var(--blood);
  }
  .stocks .panel-title {
    color: var(--blood-bright);
  }
  .body {
    padding: 16px 18px 18px;
  }
  .flavour {
    margin: 0 0 16px;
    line-height: 1.6;
    color: var(--ink-dim);
    font-style: italic;
  }
  .time {
    margin-bottom: 16px;
  }
  .time-head {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    margin-bottom: 5px;
  }
  .bar {
    height: 12px;
    background: #0f0b07;
    border: 1px solid var(--border);
    border-radius: 6px;
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: linear-gradient(90deg, #6a5a2a, #b08a3a);
    transition: width 0.4s linear;
  }
  .pay {
    width: 100%;
    padding: 11px;
  }
  .hint {
    margin: 10px 0 0;
    font-size: 0.78rem;
    text-align: center;
  }
</style>
