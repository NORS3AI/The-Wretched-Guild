<script lang="ts">
  import { gameStore, actions } from './game';
  import {
    BUSINESSES,
    ownedLevel,
    nextCost,
    meetsRequirements,
    canInvest,
    totalIncomePerTick,
  } from '../engine/businesses';
  import { factionById } from '../engine/factions';

  const game = gameStore;
  $: run = $game.run;

  function pips(level: number, max: number): string {
    return '●'.repeat(level) + '○'.repeat(max - level);
  }
</script>

<div class="panel">
  <div class="panel-title">Enterprises</div>
  <div class="body">
    <div class="summary">
      <span class="muted">Passive income</span>
      <span class="income">+{totalIncomePerTick(run).toFixed(2)} <span class="faint">coin/tick</span></span>
    </div>

    <div class="list">
      {#each BUSINESSES as b}
        {@const level = ownedLevel(run, b.id)}
        {@const maxed = level >= b.maxLevel}
        {@const req = meetsRequirements(run, b)}
        {@const cost = nextCost(b, level)}
        {@const affordable = run.coin >= cost}
        {@const investable = canInvest(run, b)}
        <div class="biz" class:owned={level > 0} class:blocked={!req.ok && level === 0}>
          <div class="biz-head">
            <span class="biz-name">{b.name}</span>
            <span class="pips" title="{level} of {b.maxLevel}">{pips(level, b.maxLevel)}</span>
          </div>
          <div class="biz-meta">
            <span class="faction-tag">{factionById(b.faction).name}</span>
            {#if b.illicit}<span class="illicit-tag">illicit · raises Heat</span>{/if}
            {#if level > 0}
              <span class="earning">earning +{(b.incomePerLevel * level).toFixed(2)}/tick</span>
            {/if}
          </div>
          <p class="biz-blurb">{b.blurb}</p>

          {#if !req.ok && level === 0}
            <div class="locks">
              {#if !req.rankOk}<span class="lock">Requires rank {b.reqRank}</span>{/if}
              {#if !req.standingOk}<span class="lock">Requires {b.reqStanding} standing with {factionById(b.faction).name}</span>{/if}
              {#if !req.alignmentOk}<span class="lock">{factionById(b.faction).gateHint}</span>{/if}
            </div>
          {:else if maxed}
            <button class="btn maxed" disabled>Fully Established</button>
          {:else}
            <button
              class="btn"
              class:primary={investable}
              disabled={!investable}
              title={!affordable ? 'Not enough coin' : ''}
              onclick={() => actions.investBusiness(b.id)}
            >
              {level === 0 ? 'Acquire' : `Expand to level ${level + 1}`} — {cost} coin
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
  .biz.blocked {
    opacity: 0.62;
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
    letter-spacing: 2px;
    font-size: 0.8rem;
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
  .biz-blurb {
    margin: 0;
    font-size: 0.76rem;
    color: var(--ink-dim);
    min-height: 2.3em;
  }
  .locks {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .lock {
    font-size: 0.72rem;
    color: var(--ink-faint);
    font-style: italic;
  }
  .btn {
    width: 100%;
    font-size: 0.82rem;
  }
  .btn.maxed {
    color: var(--green);
    border-color: var(--border);
  }
</style>
