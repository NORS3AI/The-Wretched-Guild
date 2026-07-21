<script lang="ts">
  import { gameStore, actions, devOpen } from './game';
  import { formatMoney } from '../engine/money';

  const game = gameStore;

  // coin-grant rows: each denomination, in copper, with 1/10/100/1000 buttons
  const MONEY_ROWS = [
    { name: 'Shilling', value: 1e3 },
    { name: 'Silver', value: 1e6 },
    { name: 'Crown', value: 1e9 },
    { name: 'Triton', value: 1e12 },
    { name: 'Gold', value: 1e15 },
  ];
  const AMOUNTS = [1, 10, 100, 1000];
  const DIAMOND = 1e36;

  $: godMode = $game.settings?.godMode ?? false;
  $: noHeat = $game.settings?.noHeat ?? false;
  $: fastCards = $game.settings?.fastCards ?? false;
  $: oilLeftMin = Math.ceil(($game.run.oilBuffMs ?? 0) / 60000);
</script>

<div class="overlay">
  <button class="backdrop" aria-label="Close dev panel" onclick={() => devOpen.set(false)}></button>
  <div class="dev panel">
    <div class="panel-title">Dev Panel</div>
    <div class="body">
      <p class="warn faint">Debug tools — cheats that reshape the run. Use at your own peril.</p>

      <label class="opt" class:on={godMode}>
        <input type="checkbox" checked={godMode} onchange={() => actions.toggleSetting('godMode')} />
        <span class="opt-text">
          <span class="opt-name">God mode</span>
          <span class="opt-desc faint">
            Freezes every body function (food, water, comfort, hygiene, relief) full, banishes
            illness, and pins your hearts to the max — the wretch can take no harm and cannot die.
          </span>
        </span>
      </label>

      <label class="opt" class:on={noHeat}>
        <input type="checkbox" checked={noHeat} onchange={() => actions.toggleSetting('noHeat')} />
        <span class="opt-text">
          <span class="opt-name">Never gain Heat</span>
          <span class="opt-desc faint">Your Heat (and your Guild's) is pinned to 0 — the watch never comes for you.</span>
        </span>
      </label>

      <label class="opt" class:on={fastCards}>
        <input type="checkbox" checked={fastCards} onchange={() => actions.toggleSetting('fastCards')} />
        <span class="opt-text">
          <span class="opt-name">Fast cards</span>
          <span class="opt-desc faint">Every Ply Your Trade and enterprise-work cycle finishes in a single tick.</span>
        </span>
      </label>

      <div class="cat">Rank</div>
      <p class="rank-line faint">Current rank: <strong class="gold">{$game.run.rank}</strong> of 100</p>
      <div class="grants">
        <button class="btn" disabled={$game.run.rank >= 100} onclick={() => actions.devRankUp()}>Rank up +1</button>
        <button class="btn" disabled={$game.run.rank <= 1} onclick={() => actions.devResetRank()}>Reset to rank 1</button>
      </div>

      <div class="cat">Coin</div>
      <div class="money">
        {#each MONEY_ROWS as row}
          <div class="money-row">
            <span class="money-name">{row.name}</span>
            <div class="money-btns">
              {#each AMOUNTS as amt}
                <button class="btn tiny" onclick={() => actions.grantCoin(row.value * amt)}>+{amt}</button>
              {/each}
            </div>
          </div>
        {/each}
        <div class="money-row">
          <span class="money-name">Diamond</span>
          <div class="money-btns">
            <button class="btn tiny neg" onclick={() => actions.grantCoin(-DIAMOND)}>−1</button>
          </div>
        </div>
      </div>
      <p class="purse faint">Purse: {formatMoney($game.run.coin)}</p>

      <div class="cat">Grants</div>
      <div class="grants">
        <button class="btn" onclick={() => actions.maxFactions()}>Max all Factions</button>
        <button class="btn" onclick={() => actions.grantOilBuff()}>🍶 Chalice of Infinite Oil</button>
      </div>
      {#if ($game.run.oilBuffMs ?? 0) > 0}
        <p class="oil-line">Infinite Oil active — <strong class="gold">~{oilLeftMin} min</strong> left. Cook without a Goblet of Oil.</p>
      {/if}

      <button class="btn primary close" onclick={() => devOpen.set(false)}>Done</button>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(6, 4, 2, 0.82);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 96;
    backdrop-filter: blur(2px);
  }
  .backdrop {
    position: absolute;
    inset: 0;
    background: transparent;
    border: none;
    cursor: default;
  }
  .dev {
    position: relative;
    max-width: 440px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    border-color: var(--blood);
  }
  .dev .panel-title {
    color: var(--blood-bright);
  }
  .body {
    padding: 16px 18px 18px;
  }
  .warn {
    font-size: 0.78rem;
    font-style: italic;
    margin: 0 0 14px;
  }
  .opt {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 10px;
    margin-bottom: 8px;
    cursor: pointer;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg-panel-2);
  }
  .opt.on {
    border-color: var(--gold);
  }
  .opt input {
    width: 18px;
    height: 18px;
    margin-top: 2px;
    accent-color: var(--gold);
    cursor: pointer;
    flex-shrink: 0;
  }
  .opt-text {
    display: flex;
    flex-direction: column;
    line-height: 1.35;
  }
  .opt-name {
    font-size: 0.94rem;
    color: var(--ink);
  }
  .opt-desc {
    font-size: 0.78rem;
  }
  .cat {
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--gold);
    border-bottom: 1px solid var(--border);
    padding-bottom: 4px;
    margin: 18px 0 10px;
  }
  .grants {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .money {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .money-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;
  }
  .money-name {
    font-size: 0.86rem;
    color: var(--ink-dim);
    min-width: 64px;
  }
  .money-btns {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
  }
  .btn.tiny {
    padding: 4px 8px;
    font-size: 0.74rem;
    min-width: 40px;
  }
  .btn.tiny.neg {
    color: var(--blood-bright);
  }
  .purse {
    font-size: 0.78rem;
    margin: 10px 0 0;
    font-variant-numeric: tabular-nums;
  }
  .rank-line {
    font-size: 0.82rem;
    margin: 0 0 10px;
  }
  .oil-line {
    font-size: 0.8rem;
    margin: 10px 0 0;
    color: var(--green);
  }
  .gold {
    color: var(--gold-bright);
  }
  .close {
    width: 100%;
    margin-top: 16px;
    padding: 10px;
  }
</style>
