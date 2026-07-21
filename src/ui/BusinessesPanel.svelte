<script lang="ts">
  import { gameStore, actions } from './game';
  import {
    ownedLevel,
    nextCost,
    canInvest,
    totalIncomePerTick,
    visibleBusinesses,
    workMultiplier,
    workCoinPerTick,
  } from '../engine/businesses';
  import { factionById } from '../engine/factions';
  import { formatMoney } from '../engine/money';

  const game = gameStore;
  $: run = $game.run;

  // only enterprises whose prerequisites are met (or already owned) are shown
  $: visible = visibleBusinesses(run);
</script>

<div class="panel">
  <div class="panel-title">Enterprises</div>
  <div class="body">
    <div class="summary">
      <span class="muted">Passive income</span>
      <span class="income">+{totalIncomePerTick(run).toFixed(2)} <span class="faint">coin/tick</span></span>
    </div>

    {#if visible.length === 0}
      <p class="none faint">No enterprises are within your reach yet. Save your coin and build your standing, and they will open to you.</p>
    {/if}

    <div class="list">
      {#each visible as b}
        {@const level = ownedLevel(run, b.id)}
        {@const maxed = level >= b.maxLevel}
        {@const cost = nextCost(b, level)}
        {@const affordable = run.coin >= cost}
        {@const investable = canInvest(run, b)}
        {@const working = run.activity?.id === 'work_' + b.id}
        <div class="biz" class:owned={level > 0}>
          <div class="biz-head">
            <span class="biz-name">{b.name}</span>
            <span class="pips" title="Level {level} of {b.maxLevel}">Lv {level}<span class="faint">/{b.maxLevel}</span></span>
          </div>
          <div class="biz-meta">
            <span class="faction-tag">{factionById(b.faction).name}</span>
            {#if b.illicit}<span class="illicit-tag">illicit · raises Heat</span>{/if}
            {#if level > 0}
              <span class="earning">+{(b.incomePerLevel * level).toFixed(2)}/tick idle</span>
              {#if working}
                <span class="earning working" title="Passive income plus your labour">
                  +{(b.incomePerLevel * level + workCoinPerTick(b, level)).toFixed(2)}/tick working
                </span>
              {/if}
            {/if}
          </div>
          <p class="biz-blurb">{b.blurb}</p>

          {#if level > 0}
            <!-- an owned enterprise can be WORKED for a scaled payout -->
            <button
              class="btn work"
              class:primary={working}
              onclick={() => actions.setActivity(working ? null : 'work_' + b.id)}
            >
              {working ? '■ Stop Working' : `${b.workVerb} it — ×${workMultiplier(level).toFixed(1)} yield`}
            </button>
          {/if}

          {#if maxed}
            <button class="btn maxed" disabled>Fully Established</button>
          {:else}
            <button
              class="btn"
              class:primary={investable && level === 0}
              disabled={!investable}
              title={!affordable ? 'Not enough coin' : ''}
              onclick={() => actions.investBusiness(b.id)}
            >
              {level === 0 ? 'Acquire' : `Expand to level ${level + 1}`} — {formatMoney(cost)}
            </button>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .body {
    padding: 12px;
  }
  .summary {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 6px 10px 12px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 12px;
  }
  .income {
    font-size: 1.05rem;
    color: var(--green);
    font-weight: 600;
  }
  .list {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  @media (max-width: 700px) {
    .list {
      grid-template-columns: 1fr;
    }
  }
  .biz {
    border: 1px solid var(--border);
    border-radius: 5px;
    padding: 11px 12px;
    background: var(--bg-panel-2);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .biz.owned {
    border-color: var(--border-light);
  }
  .biz-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .biz-name {
    font-weight: 600;
    font-size: 0.98rem;
  }
  .pips {
    color: var(--gold);
    font-size: 0.78rem;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .biz-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }
  .faction-tag {
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--ink-faint);
  }
  .illicit-tag {
    font-size: 0.64rem;
    color: var(--blood-bright);
    letter-spacing: 0.04em;
  }
  .earning {
    font-size: 0.7rem;
    color: var(--green);
  }
  .earning.working {
    color: var(--gold-bright);
    font-weight: 600;
  }
  .biz-blurb {
    margin: 0;
    font-size: 0.76rem;
    color: var(--ink-dim);
    min-height: 2.3em;
  }
  .btn {
    width: 100%;
    font-size: 0.82rem;
  }
  .btn.maxed {
    color: var(--green);
    border-color: var(--border);
  }
  .btn.work {
    margin-bottom: 6px;
  }
  .none {
    font-size: 0.82rem;
    font-style: italic;
    padding: 4px 2px 10px;
    line-height: 1.5;
  }
</style>
