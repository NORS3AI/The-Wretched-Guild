<script lang="ts">
  import { gameStore, actions } from './game';
  import { META_UNLOCKS, unlockCost } from '../engine/unlocks';
  import { computeVaultCarry } from '../engine/death';
  import { formatMoney } from '../engine/money';

  const game = gameStore;

  // This life's spoils are banked into meta AT DEATH, so the pools below are the
  // real, spendable totals — spend them here freely, as many times as you like.
  $: earnedLegacy = $game.run.legacyThisRun;
  $: earnedVault = computeVaultCarry($game.run);
  $: availableLegacy = $game.meta.legacy;
  $: availableTokens = $game.meta.tokens;

  // For an (infinitely) leveled unlock: current level, next-level cost, afford.
  function unlockState(u: (typeof META_UNLOCKS)[number]) {
    const level = $game.meta.unlocks[u.id] ?? 0;
    const cost = unlockCost(u, level);
    const pool = u.currency === 'tokens' ? availableTokens : availableLegacy;
    const canAfford = pool >= cost;
    return { level, cost, canAfford };
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
        <div><span class="faint">Legacy earned this life</span><strong class="gold">+{earnedLegacy}</strong></div>
        <div><span class="faint">Coin to the Guild vault</span><strong class="gold">+{formatMoney(earnedVault)}</strong></div>
        <div><span class="faint">Lives lived</span><strong>{$game.meta.runsCompleted + 1}</strong></div>
      </div>

      <div class="section">The Guild Endures</div>
      <p class="muted small">
        To spend: <strong class="gold">{availableLegacy}</strong> Legacy ·
        <strong class="token">{availableTokens}</strong> Wretched Tokens
        <span class="faint">(anything left carries over — buy as much as you like).</span>
      </p>
      <p class="muted small luck-note">
        Legacy you <em>keep</em> sharpens your Luck — every 10 unspent Legacy grants
        <strong class="gold">+{Math.floor(availableLegacy / 10)} Luck</strong> to your next wretch. Spend it, and you trade that Luck away.
      </p>

      <div class="shop">
        {#each META_UNLOCKS as u}
          {@const s = unlockState(u)}
          <div class="unlock">
            <div class="unlock-head">
              <span class="unlock-name">
                {u.name}
                <span class="lvl faint">· Level {s.level}</span>
              </span>
              <span class="cost" class:token={u.currency === 'tokens'}>{s.cost} {u.currency === 'tokens' ? 'Tokens' : 'Legacy'}</span>
            </div>
            <p class="unlock-blurb">{u.blurb} <span class="faint">({u.perLevel} per level)</span></p>
            <button
              class="btn"
              disabled={!s.canAfford}
              onclick={() => actions.buyUnlock(u.id)}
            >
              {s.canAfford
                ? `${s.level > 0 ? 'Raise to' : 'Invest —'} Level ${s.level + 1} · ${s.cost} ${u.currency === 'tokens' ? 'Tokens' : 'Legacy'} (${u.perLevel})`
                : `Not enough ${u.currency === 'tokens' ? 'Tokens' : 'Legacy'}`}
            </button>
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
  .luck-note {
    margin: 6px 0 0;
    line-height: 1.5;
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
  .lvl {
    font-size: 0.78rem;
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
