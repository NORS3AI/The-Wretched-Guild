<script lang="ts">
  import { gameStore, legacyOpen } from './game';
  import { META_UNLOCKS } from '../engine/unlocks';
  import { computeLegacy, computeTokens } from '../engine/death';

  const game = gameStore;
  $: run = $game.run;
  $: meta = $game.meta;

  // Banked, spendable pools (only spent on the death screen — not here).
  $: bankedLegacy = meta.legacy;
  $: bankedTokens = meta.tokens;

  // Kept Legacy sharpens Luck: every 10 unspent Legacy = +0.1 Luck (1%).
  $: legacyLuck = Math.floor(bankedLegacy / 10) * 0.1;

  // Only the meta-unlocks the player has actually raised at least once.
  $: ownedUnlocks = META_UNLOCKS.map((u) => ({ u, level: meta.unlocks[u.id] ?? 0 })).filter(
    (r) => r.level > 0,
  );

  // "Were you to die now" — this run's spoils, computed live from the same
  // functions death uses. A breakdown so the player sees where it comes from.
  $: projCoin = Math.floor(run.coin / 1000);
  $: projAge = Math.floor(Math.max(0, run.ageYears - 16) / 2);
  $: projRank = Math.max(0, run.rank - 1);
  $: projLegacy = computeLegacy(run);
  $: projTokens = computeTokens(run);
  $: dead = !run.alive;
</script>

<div class="overlay">
  <button class="backdrop" aria-label="Close" onclick={() => legacyOpen.set(false)}></button>
  <div class="legacy panel">
    <div class="panel-title">The Guild's Ledger</div>

    <div class="body">
      <!-- banked pools -->
      <div class="pools">
        <div class="pool">
          <span class="pool-val gold">{bankedLegacy}</span>
          <span class="pool-label">Legacy banked</span>
        </div>
        <div class="pool">
          <span class="pool-val token">{bankedTokens}</span>
          <span class="pool-label">Wretched Tokens</span>
        </div>
      </div>
      <p class="hint faint">
        These are spent only when your wretch dies — on the death screen, freely and as
        often as you like. Nothing is spent here; this is only the reckoning.
      </p>

      <!-- kept legacy → luck -->
      <div class="section">Kept Legacy &amp; Luck</div>
      <p class="body-text">
        Legacy you leave <em>unspent</em> quietly sharpens your Luck. Every <strong>10</strong>
        Legacy kept grants <strong class="gold">+0.1 Luck</strong> (that is, 1%) to your next
        wretch. Spend that Legacy on Guild unlocks and you trade the Luck away.
      </p>
      <p class="body-text">
        Your <strong class="gold">{bankedLegacy}</strong> banked Legacy is currently worth
        <strong class="gold">+{legacyLuck.toFixed(1)} Luck</strong> at birth
        <span class="faint">(atop any Beggar's Luck levels below).</span>
      </p>

      <!-- what luck is -->
      <div class="section">What Luck Does</div>
      <p class="body-text">
        Luck is an attribute from 0 to 100 that tilts fortune your way. It weights the
        <em>Wander the Village</em> opportunity roll — and other chance moments — toward good
        endings (a mentor's teaching, a clergyman's alms, found coin) and away from trouble.
        At 100 Luck it adds up to <strong>+0.5</strong> to that roll; the higher your Luck, the
        kinder the gutter.
      </p>
      <p class="body-text">
        <strong>How it's set:</strong> each life begins with Luck from your
        <em>Beggar's Luck</em> unlock (+2 per level) plus your kept-Legacy bonus above. From
        there it can inch up through play — honest labour now and then rewards a sharp eye.
        Your wretch has <strong class="gold">{run.attrs.luck.toFixed(1)} Luck</strong> right now.
      </p>

      <!-- current unlock levels -->
      <div class="section">Guild Unlocks Held</div>
      {#if ownedUnlocks.length > 0}
        <div class="unlocks">
          {#each ownedUnlocks as row (row.u.id)}
            <div class="unlock">
              <span class="unlock-name">{row.u.name}</span>
              <span class="unlock-lvl">Level {row.level}</span>
              <span class="unlock-per faint">{row.u.perLevel}</span>
            </div>
          {/each}
        </div>
      {:else}
        <p class="body-text faint">
          None yet. Spend Legacy or Tokens on the death screen to raise the Guild's blessings.
        </p>
      {/if}

      <!-- this run's projected spoils -->
      <div class="section">{dead ? 'This Life Yielded' : 'Were You to Die Now'}</div>
      <div class="proj">
        <div class="proj-row"><span class="faint">From coin held (1 per 1,000c)</span><span>{projCoin}</span></div>
        <div class="proj-row"><span class="faint">From longevity (1 per 2 years past 16)</span><span>{projAge}</span></div>
        <div class="proj-row"><span class="faint">From the climb (1 per rank above Beggar)</span><span>{projRank}</span></div>
        <div class="proj-row total"><span>Legacy this life</span><strong class="gold">{projLegacy}</strong></div>
        <div class="proj-row total"><span>Wretched Tokens this life</span><strong class="token">{projTokens}</strong></div>
      </div>

      <button class="btn primary close" onclick={() => legacyOpen.set(false)}>Close</button>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(6, 4, 2, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 95;
    backdrop-filter: blur(2px);
  }
  .backdrop {
    position: absolute;
    inset: 0;
    background: transparent;
    border: none;
    cursor: default;
  }
  .legacy {
    position: relative;
    max-width: 540px;
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    border-color: var(--gold);
  }
  .body {
    padding: 16px 18px 18px;
    overflow-y: auto;
  }
  .pools {
    display: flex;
    gap: 12px;
  }
  .pool {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 12px;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid var(--border);
    border-radius: 6px;
  }
  .pool-val {
    font-size: 1.7rem;
    font-weight: 700;
    line-height: 1;
  }
  .pool-label {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--ink-faint);
  }
  .gold {
    color: var(--gold-bright);
  }
  .token {
    color: #b98bd6;
  }
  .hint {
    font-size: 0.78rem;
    line-height: 1.5;
    margin: 10px 0 0;
    font-style: italic;
  }
  .section {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--gold);
    margin: 18px 0 8px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 4px;
  }
  .body-text {
    font-size: 0.86rem;
    line-height: 1.55;
    color: var(--ink-dim);
    margin: 0 0 8px;
  }
  .body-text:last-child {
    margin-bottom: 0;
  }
  .unlocks {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .unlock {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: baseline;
    gap: 4px 10px;
    border: 1px solid var(--border-light);
    border-radius: 5px;
    padding: 8px 11px;
    background: var(--bg-panel-2);
  }
  .unlock-name {
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--ink);
  }
  .unlock-lvl {
    color: var(--gold);
    font-size: 0.84rem;
    font-variant-numeric: tabular-nums;
  }
  .unlock-per {
    grid-column: 1 / -1;
    font-size: 0.76rem;
  }
  .proj {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 11px 13px;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid var(--border);
    border-radius: 6px;
  }
  .proj-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
    font-size: 0.84rem;
    font-variant-numeric: tabular-nums;
  }
  .proj-row.total {
    border-top: 1px solid var(--border);
    padding-top: 6px;
    margin-top: 2px;
    font-size: 0.9rem;
  }
  .close {
    width: 100%;
    margin-top: 16px;
    padding: 11px;
  }
</style>
