<script lang="ts">
  import { gameStore, actions } from './game';
  import {
    SERVANT_GROUPS,
    servantsFree,
    servantWord,
    servantMultiplier,
    totalServantWage,
  } from '../engine/servants';
  import { formatMoney } from '../engine/money';

  const game = gameStore;
  $: run = $game.run;
  $: free = servantsFree(run);
  $: word = servantWord(run);
  $: mult = servantMultiplier(run);
  $: wageBill = totalServantWage(run);

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
</script>

<div class="panel">
  <div class="panel-title">
    The Household
    {#if wageBill > 0}<span class="wage-bill faint">wages {formatMoney(wageBill)}/tick</span>{/if}
  </div>
  <div class="body">
    <p class="muted intro">
      A risen soul does not scrub their own pots. Take on {word} to run your affairs.
      {#if free}
        <strong class="free">Your bearing binds them as {word}: they toil ×{mult.toFixed(1)} as hard, and for nothing.</strong>
      {:else}
        They draw wages each moment — leave them unpaid and they will desert you.
      {/if}
    </p>

    <div class="servants">
      {#each SERVANT_GROUPS as g}
        {@const hired = !!run.servants?.[g.id]}
        {@const unlocked = run.rank >= g.reqRank}
        <div class="servant" class:hired class:locked={!unlocked}>
          <div class="s-head">
            <span class="s-name">{hired ? cap(word) + ' — ' + g.name : g.name}</span>
            <span class="s-req" class:met={unlocked}>rank {g.reqRank}</span>
          </div>
          <p class="s-blurb">{g.blurb}</p>
          <div class="s-foot">
            <span class="s-wage faint">
              {#if free}Free ({word}, ×{mult.toFixed(1)}){:else}{formatMoney(g.wage)}/tick{/if}
            </span>
            {#if !unlocked}
              <span class="s-locked faint">Unlocks at rank {g.reqRank}</span>
            {:else if hired}
              <button class="mini dismiss" onclick={() => actions.dismissServant(g.id)}>Dismiss</button>
            {:else}
              <button class="btn primary hire" onclick={() => actions.hireServant(g.id)}>Take on</button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .panel-title {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .wage-bill {
    font-size: 0.66rem;
    letter-spacing: 0.04em;
    text-transform: none;
  }
  .body {
    padding: 14px;
  }
  .intro {
    margin: 0 0 14px;
    font-size: 0.86rem;
    line-height: 1.5;
  }
  .free {
    color: var(--gold-bright);
    font-style: italic;
  }
  .servants {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .servant {
    border: 1px solid var(--border);
    border-radius: 5px;
    padding: 11px 12px;
    background: var(--bg-panel-2);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .servant.hired {
    border-color: var(--gold);
  }
  .servant.locked {
    opacity: 0.6;
  }
  .s-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }
  .s-name {
    font-weight: 600;
    font-size: 0.94rem;
  }
  .s-req {
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--blood);
    white-space: nowrap;
    flex-shrink: 0;
  }
  .s-req.met {
    color: var(--green);
  }
  .s-blurb {
    margin: 0;
    font-size: 0.8rem;
    color: var(--ink-dim);
    line-height: 1.45;
  }
  .s-foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .s-wage {
    font-size: 0.76rem;
  }
  .mini {
    background: #0f0b07;
    color: var(--ink-dim);
    border: 1px solid var(--border-light);
    border-radius: 3px;
    padding: 4px 10px;
    font-size: 0.72rem;
    font-family: inherit;
    cursor: pointer;
  }
  .mini.dismiss:hover {
    border-color: var(--blood-bright);
    color: var(--blood-bright);
  }
  .hire {
    padding: 5px 14px;
    font-size: 0.8rem;
  }
</style>
