<script lang="ts">
  import { gameStore, actions } from './game';
  import {
    CRAFT_BENCHES,
    recipesForBench,
    benchUnlocked,
    benchLockHint,
    canCraft,
    type CraftSkillId,
    type CraftRecipe,
  } from '../engine/crafting';
  import { skillLevel } from '../engine/skills';
  import { itemDef, countItem } from '../engine/items';
  import { formatMoney } from '../engine/money';
  import { REAL_MS_PER_TICK } from '../engine/timeconst';

  const game = gameStore;
  $: run = $game.run;

  // which bench (inner tab) is open — default to the first, the Lumberyard
  let bench: CraftSkillId = 'lumberyard';

  // if the open bench has since locked (new life), fall back to the Lumberyard
  $: if (!benchUnlocked(run, bench)) bench = 'lumberyard';

  $: recipes = recipesForBench(bench);

  function secondsFor(r: CraftRecipe): number {
    return Math.round((r.ticks * REAL_MS_PER_TICK) / 1000);
  }
  function fillDurationMs(r: CraftRecipe): number {
    const ticks = $game.settings?.fastCards ? 1 : r.ticks;
    return (ticks * REAL_MS_PER_TICK) / Math.max(1, $game.speed);
  }
  function itemName(id: string): string {
    return itemDef(id)?.name ?? id;
  }
</script>

<div class="panel">
  <div class="panel-title">Crafting</div>

  <!-- inner bench tabs -->
  <div class="benchbar" role="tablist">
    {#each CRAFT_BENCHES as b}
      {@const open = benchUnlocked(run, b.id)}
      {@const lvl = Math.floor(skillLevel(run, b.id))}
      <button
        class="benchtab"
        class:active={bench === b.id}
        class:locked={!open}
        role="tab"
        aria-selected={bench === b.id}
        disabled={!open}
        title={open ? b.blurb : (benchLockHint(b.id) ?? '')}
        onclick={() => open && (bench = b.id)}
      >
        {b.name}
        {#if open}<span class="benchlvl">{lvl}%</span>{:else}<span class="benchlock">🔒</span>{/if}
      </button>
    {/each}
  </div>

  {#if !benchUnlocked(run, bench)}
    <p class="locked-note">{benchLockHint(bench)}</p>
  {:else}
    {@const b = CRAFT_BENCHES.find((x) => x.id === bench)}
    <p class="bench-blurb">{b?.blurb}</p>
    <div class="recipes">
      {#each recipes as r (r.id)}
        {@const active = run.activity?.id === r.id}
        {@const craftable = canCraft(run, r)}
        {@const out = itemDef(r.output.item)}
        <div class="recipe" class:active class:dim={!craftable && !active}>
          <div class="r-head">
            <span class="r-name">{r.name}</span>
            <span class="r-out">
              → {r.output.qty > 1 ? r.output.qty + '× ' : ''}{itemName(r.output.item)}
              {#if out && out.value > 0}<span class="r-val" title="Sells for">{formatMoney(out.value)}</span>{/if}
            </span>
          </div>
          <div class="r-inputs">
            {#each r.inputs as inp}
              {@const have = countItem(run, inp.item)}
              <span class="ing" class:short={have < inp.qty}>
                {inp.qty}× {itemName(inp.item)} <span class="have">({have})</span>
              </span>
            {/each}
            {#if r.returns}
              <span class="ing returns" title="Handed back each craft">+ {r.returns.qty}× {itemName(r.returns.item)} back</span>
            {/if}
          </div>
          <div class="r-bar">
            {#if active}
              <div
                class="r-fill filling"
                style="animation-duration:{fillDurationMs(r)}ms; animation-play-state:{$game.paused ? 'paused' : 'running'}"
              ></div>
            {:else}
              <div class="r-fill"></div>
            {/if}
          </div>
          <div class="r-foot">
            <span class="r-time">{secondsFor(r)}s</span>
            <button
              class="btn craftbtn"
              class:primary={craftable && !active}
              disabled={!active && !craftable}
              onclick={() => actions.setActivity(active ? null : r.id)}
            >
              {active ? 'Working… (stop)' : craftable ? 'Craft' : 'Need stock'}
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .benchbar {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 12px 12px 0;
  }
  .benchtab {
    flex: 1 1 auto;
    font-family: inherit;
    font-size: 0.72rem;
    letter-spacing: 0.03em;
    padding: 6px 8px;
    background: var(--bg-panel-2);
    border: 1px solid var(--border);
    border-radius: 5px;
    color: var(--ink-dim);
    cursor: pointer;
    white-space: nowrap;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }
  .benchtab:hover:not(:disabled) {
    border-color: var(--border-light);
    color: var(--ink);
  }
  .benchtab.active {
    border-color: var(--gold);
    color: var(--gold-bright);
    background: rgba(201, 162, 39, 0.1);
  }
  .benchtab.locked {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .benchlvl {
    font-size: 0.66rem;
    color: var(--gold);
    font-variant-numeric: tabular-nums;
  }
  .benchlock {
    font-size: 0.66rem;
  }
  .locked-note {
    padding: 18px 14px;
    margin: 0;
    font-size: 0.86rem;
    font-style: italic;
    color: var(--ink-dim);
    line-height: 1.55;
  }
  .bench-blurb {
    padding: 10px 14px 0;
    margin: 0;
    font-size: 0.8rem;
    color: var(--ink-dim);
  }
  .recipes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    padding: 12px;
  }
  @media (max-width: 640px) {
    .recipes {
      grid-template-columns: 1fr;
    }
  }
  .recipe {
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: var(--bg-panel-2);
    border: 1px solid var(--border);
    border-radius: 5px;
    padding: 10px 11px;
    transition: border-color 0.15s, opacity 0.15s;
  }
  .recipe.active {
    border-color: var(--gold);
    background: rgba(201, 162, 39, 0.07);
  }
  .recipe.dim {
    opacity: 0.62;
  }
  .r-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }
  .r-name {
    font-weight: 600;
    font-size: 0.9rem;
  }
  .r-out {
    font-size: 0.72rem;
    color: var(--ink-dim);
    text-align: right;
  }
  .r-val {
    color: var(--gold);
    margin-left: 4px;
  }
  .r-inputs {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    font-size: 0.72rem;
    color: var(--ink-dim);
  }
  .ing .have {
    color: var(--ink-faint);
  }
  .ing.short {
    color: var(--blood-bright);
  }
  .ing.short .have {
    color: var(--blood-bright);
  }
  .ing.returns {
    color: var(--green);
    font-style: italic;
  }
  .r-bar {
    height: 5px;
    background: #0f0b07;
    border-radius: 3px;
    overflow: hidden;
  }
  .r-fill {
    height: 100%;
    width: 0;
    background: var(--gold);
  }
  .r-fill.filling {
    animation-name: craftfill;
    animation-timing-function: linear;
    animation-iteration-count: infinite;
  }
  @keyframes craftfill {
    from {
      width: 0;
    }
    to {
      width: 100%;
    }
  }
  .r-foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .r-time {
    font-size: 0.7rem;
    color: var(--ink-faint);
    font-variant-numeric: tabular-nums;
  }
  .craftbtn {
    font-size: 0.76rem;
  }
</style>
