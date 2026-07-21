<script lang="ts">
  import { gameStore, actions } from './game';
  import { DEEDS } from '../engine/deeds';
  import { climateNow } from '../engine/survival';
  import { itemDef, isEdible } from '../engine/items';

  const game = gameStore;
  $: run = $game.run;
  $: climate = climateNow(run);
  $: usedSlots = run.pockets.filter(Boolean).length;
  $: larderUsed = run.larder.filter(Boolean).length;

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

  // Reactive so the list re-derives when the weather, inventory, or illness
  // changes (all live on `run`). A deed with a `reveal` predicate stays hidden
  // until it applies — Seek Warmth only when cold, Cook a Fish only once you
  // hold a fish, See a Doctor only when sick, and so on.
  $: deedRows = DEEDS.filter((d) => !d.reveal || d.reveal(run)).map((d) => ({
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
        {#if run.weatherproof}
          <span class="warm" title="Neither cold nor heat can touch you">🎩 Sheltered</span>
        {:else if run.warmClothes && climate === 'cold'}
          <span class="warm" title="Your woollens keep the cold out">🧥 Woollens</span>
        {:else if run.warmUntil > run.tick}
          <span class="warm" title="The cold cannot touch you">🔥 Warm ~{run.warmUntil - run.tick}h</span>
        {/if}
        {#if (run.oilBuffMs ?? 0) > 0}
          <span class="warm oil" title="Cook without a Goblet of Oil">🍶 Oil ~{Math.ceil(run.oilBuffMs / 60000)}m</span>
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

    <!-- larder: six slots just for food, so ingredients never crowd out cooking -->
    <div class="section-label">
      Larder
      <span class="slots faint">{larderUsed}/{run.larder.length} food</span>
    </div>
    <div class="pockets">
      {#each run.larder as slot}
        {@const def = slot ? itemDef(slot.item) : null}
        <div class="slot" class:empty={!slot}>
          {#if slot && def}
            {#if isEdible(def)}
              <button class="slot-top eat" title="Tap to eat · {def.blurb}" onclick={() => actions.eatItem(slot.item)}>
                <span class="slot-name">{def.name}</span>
                {#if slot.qty > 1}<span class="slot-qty">×{slot.qty}</span>{/if}
              </button>
            {:else}
              <div class="slot-top">
                <span class="slot-name" title={def.blurb}>{def.name}</span>
                {#if slot.qty > 1}<span class="slot-qty">×{slot.qty}</span>{/if}
              </div>
            {/if}
            <div class="slot-actions">
              {#if isEdible(def)}
                <button class="mini eat" title="Eat this" onclick={() => actions.eatItem(slot.item)}>Eat</button>
              {:else if def.kind === 'food'}
                <span class="cook-note faint" title="Roast or cook it under Tend to Yourself before it is fit to eat">cook first</span>
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

    <!-- pockets & vendor -->
    <div class="section-label">
      Pockets &amp; Pedlar
      <span class="slots faint">{usedSlots}/{run.pockets.length} slots</span>
    </div>
    <div class="pockets">
      {#each run.pockets as slot}
        {@const def = slot ? itemDef(slot.item) : null}
        <div class="slot" class:empty={!slot}>
          {#if slot && def}
            {#if isEdible(def)}
              <button class="slot-top eat" title="Tap to eat · {def.blurb}" onclick={() => actions.eatItem(slot.item)}>
                <span class="slot-name">{def.name}</span>
                {#if slot.qty > 1}<span class="slot-qty">×{slot.qty}</span>{/if}
              </button>
            {:else}
              <div class="slot-top">
                <span class="slot-name" title={def.blurb}>{def.name}</span>
                {#if slot.qty > 1}<span class="slot-qty">×{slot.qty}</span>{/if}
              </div>
            {/if}
            <div class="slot-actions">
              {#if isEdible(def)}
                <button class="mini eat" title="Eat this" onclick={() => actions.eatItem(slot.item)}>Eat</button>
              {:else if def.kind === 'food'}
                <span class="cook-note faint" title="Roast or cook it under Tend to Yourself before it is fit to eat">cook first</span>
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
  .weather .warm.oil {
    color: var(--green);
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
  /* an edible slot's name row is itself the Eat button — tap the food to eat it */
  button.slot-top.eat {
    font-family: inherit;
    font-size: inherit;
    text-align: left;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 3px;
    color: var(--ink);
    padding: 2px 4px;
    margin: -2px -4px;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }
  button.slot-top.eat:hover {
    border-color: var(--green);
    color: var(--green);
    background: rgba(120, 160, 70, 0.1);
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
  .mini.eat {
    color: var(--green);
  }
  .cook-note {
    flex: 1;
    align-self: center;
    font-size: 0.68rem;
    font-style: italic;
  }
  .mini.eat:hover {
    border-color: var(--green);
    color: var(--green);
  }
  .mini.sell {
    color: var(--gold);
  }
  .slots {
    font-size: 0.62rem;
    letter-spacing: 0.04em;
    float: right;
    text-transform: none;
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
