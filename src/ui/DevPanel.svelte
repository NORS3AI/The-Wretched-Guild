<script lang="ts">
  import { gameStore, actions, devOpen } from './game';
  import { formatMoney } from '../engine/money';

  const game = gameStore;
  $: godMode = $game.settings?.godMode ?? false;
  $: noHeat = $game.settings?.noHeat ?? false;
  $: fastCards = $game.settings?.fastCards ?? false;
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

      <div class="cat">Grants</div>
      <div class="grants">
        <button class="btn" onclick={() => actions.addDiamond()}>+1 Diamond</button>
        <button class="btn" onclick={() => actions.maxFactions()}>Max all Factions</button>
      </div>
      <p class="purse faint">Purse: {formatMoney($game.run.coin)}</p>

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
  .purse {
    font-size: 0.78rem;
    margin: 10px 0 0;
    font-variant-numeric: tabular-nums;
  }
  .rank-line {
    font-size: 0.82rem;
    margin: 0 0 10px;
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
