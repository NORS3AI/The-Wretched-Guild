<script lang="ts">
  import { gameStore, actions } from './game';
  import { itemDef, VENDOR_STOCK } from '../engine/items';
  import { shopOpen, formatClock, SHOP_OPEN_HOUR, SHOP_CLOSE_HOUR } from '../engine/time';

  const game = gameStore;
  $: run = $game.run;
  $: open = shopOpen(run);
</script>

<div class="panel vendor-panel">
  <div class="panel-title">
    The Town Merchant
    <span class="hours faint">{formatClock(SHOP_OPEN_HOUR)} – {formatClock(SHOP_CLOSE_HOUR)}</span>
  </div>
  <div class="body">
    {#if open}
      <p class="muted intro">
        "Fresh in this morning — oil for the pan, butter for the pot. What'll it be?"
      </p>
      <div class="wares">
        {#each VENDOR_STOCK as id}
          {@const def = itemDef(id)}
          {#if def && def.buy != null}
            <div class="ware">
              <div class="ware-main">
                <span class="ware-name">{def.name}</span>
                <p class="ware-desc faint">{def.blurb}</p>
              </div>
              <button
                class="btn primary buy"
                disabled={run.coin < def.buy}
                onclick={() => actions.buyItem(id)}
              >
                Buy · {def.buy}c
              </button>
            </div>
          {/if}
        {/each}
      </div>
    {:else}
      <div class="closed">
        <div class="sign">— We're Closed —</div>
        <p class="closed-note">
          The town merchant has shuttered for the night. Come back when the doors open at
          <strong>{formatClock(SHOP_OPEN_HOUR)}</strong>.
        </p>
        <p class="closed-hours faint">
          Open daily, {formatClock(SHOP_OPEN_HOUR)} to {formatClock(SHOP_CLOSE_HOUR)}.
        </p>
      </div>
    {/if}
  </div>
</div>

<style>
  .vendor-panel {
    border-color: var(--gold);
  }
  .panel-title {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .hours {
    font-size: 0.66rem;
    letter-spacing: 0.06em;
    text-transform: none;
  }
  .body {
    padding: 14px;
  }
  .intro {
    margin: 0 0 14px;
    font-size: 0.88rem;
    line-height: 1.5;
    font-style: italic;
  }
  .wares {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .ware {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
    border: 1px solid var(--border-light);
    border-radius: 5px;
    padding: 11px 13px;
    background: var(--bg-panel-2);
  }
  .ware-main {
    flex: 1 1 200px;
    min-width: 0;
  }
  .ware-name {
    font-size: 0.94rem;
    color: var(--ink);
  }
  .ware-desc {
    font-size: 0.78rem;
    line-height: 1.4;
    margin: 3px 0 0;
  }
  .buy {
    flex-shrink: 0;
    padding: 7px 16px;
  }
  .closed {
    text-align: center;
    padding: 26px 14px;
  }
  .sign {
    font-size: 1.3rem;
    color: var(--blood-bright);
    letter-spacing: 0.06em;
    margin-bottom: 12px;
  }
  .closed-note {
    font-size: 0.9rem;
    line-height: 1.55;
    color: var(--ink-dim);
    margin: 0 0 8px;
  }
  .closed-hours {
    font-size: 0.78rem;
    font-style: italic;
    margin: 0;
  }
</style>
