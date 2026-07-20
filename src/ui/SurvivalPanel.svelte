<script lang="ts">
  import { gameStore, actions } from './game';
  import { DEEDS } from '../engine/deeds';
  import { climateNow } from '../engine/survival';
  import { itemDef, isEdible } from '../engine/items';

  const game = gameStore;
  $: run = $game.run;
  $: climate = climateNow(run);

  const needRows = [
    { key: 'food', label: 'Food', low: 'Starving' },
    { key: 'water', label: 'Water', low: 'Parched' },
    { key: 'comfort', label: 'Comfort', low: 'Exposed' },
    { key: 'hygiene', label: 'Hygiene', low: 'Filthy' },
    { key: 'relief', label: 'Relief', low: 'Desperate' },
  ] as const;

  function needClass(v: number): string {
    if (v <= 15) return 'crit';
    if (v <= 40) return 'warn';
    return '';
  }

  // Reactive so the list re-derives when the weather or run state changes
  // (a plain function wouldn't — Svelte can't see `climate`/`run` inside it,
  // which is why cold used to still show "Seek Shade").
  $: deedRows = DEEDS.filter((d) => {
    if (d.id === 'seek_warmth') return climate === 'cold';
    if (d.id === 'seek_shade') return climate === 'hot';
    return true;
  }).map((d) => ({
    def: d,
    enabled:
      run.stocksUntil === null &&
      (!d.available || d.available(run)) &&
      !(d.cost && run.coin < d.cost),
  }));
</script>

<div class="panel">
  <div class="panel-title">Body & Needs</div>
  <div class="body">
    <div class="weather">
      <span>
        The air is
        <strong class:cold={climate === 'cold'} class:hot={climate === 'hot'}>{climate}</strong>.
        {#if run.warmUntil > run.tick}
          <span class="warm" title="The cold cannot touch you">🔥 Warm ~{run.warmUntil - run.tick}h</span>
        {/if}
      </span>
      <span class="faint">Waterskin: {run.waterskinCharges}/{run.waterskinMax}</span>
    </div>

    <!-- needs -->
    <div class="needs">
      {#each needRows as n}
        {@const v = run.needs[n.key]}
        <div class="need">
          <span class="need-label">{n.label}</span>
          <div class="bar">
            <div class="fill {needClass(v)}" style="width:{v}%"></div>
          </div>
          <span class="need-val {needClass(v)}">{v <= 0 ? n.low : Math.round(v)}</span>
        </div>
      {/each}
    </div>

    <!-- inventory / vendor -->
    <div class="section-label">Pockets &amp; Pedlar</div>
    <div class="pockets">
      {#each run.pockets as slot}
        {@const def = slot ? itemDef(slot.item) : null}
        <div class="slot" class:empty={!slot}>
          {#if slot && def}
            <div class="slot-top">
              <span class="slot-name" title={def.blurb}>{def.name}</span>
              {#if slot.qty > 1}<span class="slot-qty">×{slot.qty}</span>{/if}
            </div>
            <div class="slot-actions">
              {#if isEdible(def)}
                <button class="mini" title="Eat" onclick={() => actions.eatItem(slot.item)}>Eat</button>
              {/if}
              <button class="mini sell" title="Sell to the pedlar" onclick={() => actions.sellItem(slot.item)}>
                Sell {def.value}c
              </button>
            </div>
          {:else}
            <span class="slot-empty faint">— empty —</span>
          {/if}
        </div>
      {/each}
    </div>

    <!-- deeds -->
    <div class="section-label">Tend to Yourself</div>
    <div class="deeds">
      {#each deedRows as row (row.def.id)}
        <button
          class="btn deed"
          disabled={!row.enabled}
          title={row.def.blurb}
          onclick={() => actions.doDeed(row.def.id)}
        >
          {row.def.name}
          {#if row.def.timeTicks > 0}<span class="time">· {row.def.timeTicks}h</span>{/if}
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  .body {
    padding: 12px 14px 14px;
  }
  .weather {
    font-size: 0.84rem;
    color: var(--ink-dim);
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 6px;
  }
  .weather strong {
    color: var(--ink);
    text-transform: capitalize;
  }
  .weather strong.cold {
    color: #7fa8d0;
  }
  .weather strong.hot {
    color: #d08a4f;
  }
  .weather .warm {
    color: #e08a3a;
    font-size: 0.76rem;
    white-space: nowrap;
  }
  .needs {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .need {
    display: grid;
    grid-template-columns: 62px 1fr 54px;
    align-items: center;
    gap: 8px;
    font-size: 0.8rem;
  }
  .need-label {
    color: var(--ink-dim);
  }
  .bar {
    height: 9px;
    background: #0f0b07;
    border: 1px solid var(--border);
    border-radius: 5px;
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: linear-gradient(90deg, #55702f, #86a94e);
    transition: width 0.3s ease;
  }
  .fill.warn {
    background: linear-gradient(90deg, #8a6a1e, #d0913a);
  }
  .fill.crit {
    background: linear-gradient(90deg, #7a2a2a, #c04a3f);
  }
  .need-val {
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: var(--ink-faint);
    font-size: 0.74rem;
  }
  .need-val.warn {
    color: var(--gold);
  }
  .need-val.crit {
    color: var(--blood-bright);
  }
  .section-label {
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--gold);
    margin: 16px 0 8px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 4px;
  }
  .pockets {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .slot {
    border: 1px solid var(--border-light);
    border-radius: 4px;
    padding: 7px 9px;
    background: var(--bg-panel-2);
    font-size: 0.82rem;
    display: flex;
    flex-direction: column;
    gap: 6px;
    justify-content: center;
    min-height: 34px;
  }
  .slot.empty {
    flex-direction: row;
    align-items: center;
    border-style: dashed;
    border-color: var(--border);
  }
  .slot-top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 6px;
  }
  .slot-name {
    line-height: 1.2;
  }
  .slot-actions {
    display: flex;
    gap: 5px;
  }
  .mini {
    flex: 1;
    background: #0f0b07;
    color: var(--ink-dim);
    border: 1px solid var(--border-light);
    border-radius: 3px;
    padding: 3px 6px;
    font-size: 0.72rem;
    font-family: inherit;
  }
  .mini:hover {
    border-color: var(--gold);
    color: var(--gold-bright);
  }
  .mini.sell {
    color: var(--gold);
  }
  .slot-qty {
    color: var(--gold);
    font-size: 0.76rem;
  }
  .slot-empty {
    font-size: 0.76rem;
    font-style: italic;
  }
  .deeds {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .deed {
    font-size: 0.8rem;
  }
  .deed .time {
    color: var(--ink-faint);
    font-size: 0.72rem;
  }
</style>
