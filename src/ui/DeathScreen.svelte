<script lang="ts">
  import { gameStore, actions } from './game';
  import { META_UNLOCKS } from '../engine/unlocks';
  import { computeLegacy, computeVaultCarry, computeTokens } from '../engine/death';
  import { formatMoney } from '../engine/money';

  const game = gameStore;

  // Meta is folded in only when the new life begins, so preview the gains here.
  $: pendingLegacy = computeLegacy($game.run);
  $: pendingVault = computeVaultCarry($game.run);
  $: pendingTokens = computeTokens($game.run);
  $: availableLegacy = $game.meta.legacy + pendingLegacy;
  $: availableTokens = Math.round(($game.meta.tokens + pendingTokens) * 4) / 4;

  function affordable(u: (typeof META_UNLOCKS)[number]): boolean {
    return u.currency === 'tokens' ? availableTokens >= u.cost : availableLegacy >= u.cost;
  }
</script>

<div class="overlay">
  <div class="death panel">
    <div class="panel-title">The Wretch is Dead</div>
    <div class="body">
      <p class="cause">
        {$game.run.deathCause ?? 'dead'}, at the age of {$game.run.ageYears}.
      </p>

      <div class="tally">
        <div><span class="faint">Legacy earned this life</span><strong class="gold">+{pendingLegacy}</strong></div>
        <div><span class="faint">Coin to the Guild vault</span><strong class="gold">+{formatMoney(pendingVault)}</strong></div>
        {#if pendingTokens > 0}
          <div><span class="faint">Wretched Tokens earned</span><strong class="token">+{pendingTokens}</strong></div>
        {/if}
        <div><span class="faint">Lives lived</span><strong>{$game.meta.runsCompleted + 1}</strong></div>
      </div>

      <div class="section">The Guild Endures</div>
      <p class="muted small">
        Available: <strong class="gold">{availableLegacy}</strong> Legacy ·
        <strong class="token">{availableTokens}</strong> Wretched Tokens
        <span class="faint">(both carry over — spend now or later).</span>
      </p>

      <div class="shop">
        {#each META_UNLOCKS as u}
          {@const owned = $game.meta.unlocks[u.id]}
          {@const canAfford = affordable(u)}
          <div class="unlock" class:owned>
            <div class="unlock-head">
              <span class="unlock-name">{u.name}</span>
              {#if owned}
                <span class="owned-tag">Owned</span>
              {:else}
                <span class="cost" class:token={u.currency === 'tokens'}>{u.cost} {u.currency === 'tokens' ? 'Tokens' : 'Legacy'}</span>
              {/if}
            </div>
            <p class="unlock-blurb">{u.blurb}</p>
            {#if !owned}
              <button
                class="btn"
                disabled={!canAfford}
                onclick={() => actions.buyUnlock(u.id)}
              >
                {canAfford ? 'Invest' : `Not enough ${u.currency === 'tokens' ? 'Tokens' : 'Legacy'}`}
              </button>
            {/if}
          </div>
        {/each}
      </div>

      <button class="btn primary begin" onclick={() => actions.beginNewLife()}>
        Begin a New Life →
      </button>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(6, 4, 2, 0.86);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 50;
    backdrop-filter: blur(2px);
  }
  .death {
    max-width: 520px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    border-color: var(--blood);
  }
  .death .panel-title {
    color: var(--blood-bright);
    text-align: center;
    font-size: 0.9rem;
  }
  .body {
    padding: 20px 22px 24px;
  }
  .cause {
    text-align: center;
    font-size: 1.1rem;
    font-style: italic;
    color: var(--ink);
    margin: 0 0 18px;
    text-transform: capitalize;
  }
  .tally {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 14px;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid var(--border);
    border-radius: 5px;
  }
  .tally div {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
  }
  .gold {
    color: var(--gold-bright);
  }
  .token {
    color: #b98bd6;
  }
  .section {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--gold);
    margin: 20px 0 6px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 4px;
  }
  .small {
    font-size: 0.82rem;
  }
  .shop {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 12px 0 20px;
  }
  .unlock {
    border: 1px solid var(--border-light);
    border-radius: 5px;
    padding: 11px 13px;
    background: var(--bg-panel-2);
  }
  .unlock.owned {
    opacity: 0.65;
    border-style: dashed;
  }
  .unlock-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 4px;
  }
  .unlock-name {
    font-weight: 600;
  }
  .cost {
    color: var(--gold);
    font-size: 0.82rem;
  }
  .owned-tag {
    font-size: 0.72rem;
    color: var(--green);
  }
  .unlock-blurb {
    margin: 0 0 9px;
    font-size: 0.82rem;
    color: var(--ink-dim);
  }
  .begin {
    width: 100%;
    padding: 12px;
    font-size: 1rem;
  }
</style>
