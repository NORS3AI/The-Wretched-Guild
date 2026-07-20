<script lang="ts">
  import { gameStore, actions } from './game';
  import { advancement, rankTitle, bandName, MAX_RANK } from '../engine/ranks';
  import { FACTIONS } from '../engine/factions';

  const game = gameStore;

  $: run = $game.run;
  $: adv = advancement(run);
  $: title = rankTitle(run);
</script>

<div class="panel">
  <div class="panel-title">Standing in the World</div>
  <div class="body">
    <!-- rank -->
    <div class="rank-head">
      <div class="rank-badge">{run.rank}</div>
      <div>
        <div class="rank-title">{title}</div>
        <div class="rank-band faint">{bandName(run.rank)} · rung {run.rank} of 100</div>
      </div>
    </div>

    <!-- advancement -->
    {#if adv.atMax}
      <p class="atmax muted">You have climbed as far as this age of the world allows. (Rank {MAX_RANK} — the ladder grows in a later chapter.)</p>
    {:else if adv.req}
      <div class="advance">
        <div class="req-label faint">To rise to rung {adv.nextRank} — <em>spends what it costs</em>:</div>
        <div class="req" class:met={adv.coinMet}>
          <span class="tick">{adv.coinMet ? '✓' : '○'}</span>
          <span>Coppers (spent)</span>
          <span class="req-val">{Math.floor(run.coin)} / {adv.req.minCoin}</span>
        </div>
        {#if adv.req.minCombined > 0}
          <div class="req" class:met={adv.standingMet}>
            <span class="tick">{adv.standingMet ? '✓' : '○'}</span>
            <span>Combined standing (spent)</span>
            <span class="req-val">{Math.floor(adv.combined)} / {adv.req.minCombined}</span>
          </div>
        {/if}
        {#if adv.milestone && !adv.milestonePassed}
          <div class="rite-note">⚜ A Rite of Passage awaits at this rung.</div>
        {/if}
        <button
          class="btn primary advance-btn"
          class:rite={adv.eligible && adv.milestone && !adv.milestonePassed}
          disabled={!adv.eligible}
          onclick={() => actions.seekAdvancement()}
        >
          {#if !adv.eligible}
            Not Yet Worthy
          {:else if adv.milestone && !adv.milestonePassed}
            Undertake the Rite →
          {:else}
            Seek Advancement →
          {/if}
        </button>
      </div>
    {/if}

    <!-- factions -->
    <div class="section-label">Factions</div>
    <div class="factions">
      {#each FACTIONS as f}
        {@const barred = !f.admits(run.alignment)}
        <div class="faction" class:barred title={barred ? f.gateHint : f.blurb}>
          <div class="faction-head">
            <span class="faction-name">{f.name}</span>
            {#if barred}
              <span class="barred-tag">barred</span>
            {:else}
              <span class="faction-val">{Math.floor(run.factions[f.id])}</span>
            {/if}
          </div>
          <div class="bar slim">
            <div class="fill faction-fill" style="width:{barred ? 0 : run.factions[f.id]}%"></div>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .body {
    padding: 14px;
  }
  .rank-head {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
  }
  .rank-badge {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: 50%;
    border: 2px solid var(--gold);
    background: radial-gradient(circle at 40% 35%, #3a2d16, #1a130a);
    color: var(--gold-bright);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.3rem;
    font-weight: 600;
    box-shadow: 0 0 8px rgba(201, 162, 39, 0.3);
  }
  .rank-title {
    font-size: 1.15rem;
    font-weight: 600;
    color: var(--ink);
  }
  .rank-band {
    font-size: 0.72rem;
  }
  .advance {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--border);
    border-radius: 5px;
    padding: 11px 12px;
  }
  .req-label {
    font-size: 0.72rem;
    margin-bottom: 7px;
  }
  .req {
    display: grid;
    grid-template-columns: 18px 1fr auto;
    align-items: center;
    gap: 6px;
    font-size: 0.86rem;
    color: var(--ink-dim);
    padding: 2px 0;
  }
  .req.met {
    color: var(--green);
  }
  .req .tick {
    text-align: center;
  }
  .req-val {
    font-variant-numeric: tabular-nums;
    color: var(--ink-faint);
  }
  .req.met .req-val {
    color: var(--green);
  }
  .advance-btn {
    width: 100%;
    margin-top: 10px;
  }
  .advance-btn.rite {
    border-color: var(--blood);
    color: var(--gold-bright);
    background: rgba(140, 47, 47, 0.14);
  }
  .rite-note {
    margin-top: 8px;
    font-size: 0.76rem;
    color: var(--blood-bright);
    font-style: italic;
  }
  .atmax {
    font-size: 0.85rem;
    font-style: italic;
  }
  .section-label {
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--gold);
    margin: 16px 0 9px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 4px;
  }
  .factions {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }
  .faction {
    font-size: 0.82rem;
  }
  .faction-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 3px;
  }
  .faction-name {
    color: var(--ink-dim);
  }
  .faction-val {
    font-variant-numeric: tabular-nums;
    color: var(--ink);
  }
  .faction.barred .faction-name {
    color: var(--ink-faint);
    text-decoration: line-through;
  }
  .barred-tag {
    font-size: 0.68rem;
    color: var(--blood);
    font-style: italic;
  }
  .bar {
    position: relative;
    height: 7px;
    background: #0f0b07;
    border: 1px solid var(--border);
    border-radius: 4px;
    overflow: hidden;
  }
  .fill {
    height: 100%;
    transition: width 0.3s ease;
  }
  .faction-fill {
    background: linear-gradient(90deg, #6a5a86, #9a7fc0);
  }
</style>
