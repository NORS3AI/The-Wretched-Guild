<script lang="ts">
  import { gameStore, actions } from './game';
  import { carryOffers, canBuyCarry } from '../engine/merchant';
  import { inventoryCapacity } from '../engine/items';
  import { factionById } from '../engine/factions';

  const game = gameStore;
  $: run = $game.run;
  $: offers = carryOffers(run);
</script>

<div class="panel merchant">
  <div class="panel-title">
    The Wandering Merchant
    <button class="leave" onclick={() => actions.dismissMerchant()}>Leave →</button>
  </div>
  <div class="body">
    <p class="muted intro">
      "Packs, pouches, beasts of burden — everything a rising soul needs to haul their
      fortune. What'll it be?" You can carry <strong>{inventoryCapacity(run)}</strong> slots.
    </p>

    <div class="offers">
      {#each offers as offer}
        {@const buyable = canBuyCarry(run, offer)}
        <div class="offer" class:maxed={offer.maxed}>
          <div class="offer-main">
            <div class="offer-name">
              {offer.name}
              {#if !offer.maxed}<span class="offer-slots">+{offer.slots} slots</span>{/if}
            </div>
            <p class="offer-desc faint">{offer.desc}</p>
          </div>
          <div class="offer-buy">
            {#if offer.maxed}
              <span class="offer-max">All bought.</span>
            {:else}
              <div class="req">
                <span class="cost" class:short={run.coin < offer.cost}>{offer.cost}c</span>
                <span class="faction" class:short={run.factions[offer.faction] < offer.factionReq}>
                  {factionById(offer.faction).name} {offer.factionReq}
                </span>
              </div>
              <button class="btn primary buy" disabled={!buyable} onclick={() => actions.buyCarry(offer.kind)}>
                Buy
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .merchant {
    border-color: var(--gold);
  }
  .merchant .panel-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .leave {
    font-family: inherit;
    background: transparent;
    border: 1px solid var(--border-light);
    border-radius: 4px;
    color: var(--ink-dim);
    font-size: 0.66rem;
    letter-spacing: 0.06em;
    text-transform: none;
    padding: 3px 9px;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }
  .leave:hover {
    border-color: var(--gold);
    color: var(--gold-bright);
  }
  .body {
    padding: 14px;
  }
  .intro {
    margin: 0 0 12px;
    font-size: 0.86rem;
    line-height: 1.5;
    font-style: italic;
  }
  .offers {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .offer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
    border: 1px solid var(--border-light);
    border-radius: 5px;
    padding: 10px 12px;
    background: var(--bg-panel-2);
  }
  .offer.maxed {
    opacity: 0.55;
  }
  .offer-main {
    flex: 1 1 220px;
    min-width: 0;
  }
  .offer-name {
    font-size: 0.92rem;
    color: var(--ink);
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
  }
  .offer-slots {
    font-size: 0.72rem;
    color: var(--green);
    white-space: nowrap;
  }
  .offer-desc {
    font-size: 0.78rem;
    line-height: 1.4;
    margin: 3px 0 0;
  }
  .offer-buy {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }
  .req {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    line-height: 1.35;
    font-size: 0.74rem;
    color: var(--ink-dim);
    white-space: nowrap;
  }
  .cost {
    color: var(--gold);
  }
  .cost.short,
  .faction.short {
    color: var(--blood-bright);
  }
  .offer-max {
    font-size: 0.74rem;
    font-style: italic;
    color: var(--ink-faint);
  }
  .buy {
    padding: 6px 18px;
  }
</style>
