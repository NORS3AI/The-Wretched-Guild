<script lang="ts">
  import { gameStore, actions } from './game';
  import { carryOffers, canBuyCarry } from '../engine/merchant';
  import { inventoryCapacity } from '../engine/items';
  import { factionById } from '../engine/factions';

  const game = gameStore;
  $: run = $game.run;
  $: offers = carryOffers(run);
  $: hoursLeft = Math.max(0, run.merchantUntil - run.tick);
</script>

<div class="panel merchant">
  <div class="panel-title">
    The Wandering Merchant
    <span class="leaving faint">leaves in ~{hoursLeft}h</span>
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
          <div class="offer-head">
            <span class="offer-name">{offer.name}</span>
            {#if !offer.maxed}<span class="offer-slots">+{offer.slots} slots</span>{/if}
          </div>
          <p class="offer-desc faint">{offer.desc}</p>
          {#if offer.maxed}
            <span class="offer-max">Nothing more of this kind to sell.</span>
          {:else}
            <div class="offer-foot">
              <span class="req">
                <span class="cost" class:short={run.coin < offer.cost}>{offer.cost}c</span>
                <span class="faction" class:short={run.factions[offer.faction] < offer.factionReq}>
                  · {factionById(offer.faction).name} {offer.factionReq}
                </span>
              </span>
              <button class="btn primary buy" disabled={!buyable} onclick={() => actions.buyCarry(offer.kind)}>
                Buy
              </button>
            </div>
          {/if}
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
    align-items: baseline;
  }
  .leaving {
    font-size: 0.66rem;
    letter-spacing: 0.04em;
    text-transform: none;
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
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
  }
  @media (max-width: 720px) {
    .offers {
      grid-template-columns: 1fr;
    }
  }
  .offer {
    border: 1px solid var(--border-light);
    border-radius: 5px;
    padding: 10px 11px;
    background: var(--bg-panel-2);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .offer.maxed {
    opacity: 0.55;
  }
  .offer-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 6px;
  }
  .offer-name {
    font-size: 0.9rem;
    color: var(--ink);
  }
  .offer-slots {
    font-size: 0.72rem;
    color: var(--green);
    white-space: nowrap;
  }
  .offer-desc {
    font-size: 0.76rem;
    line-height: 1.4;
    margin: 0;
    flex: 1;
  }
  .offer-foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }
  .req {
    font-size: 0.74rem;
    color: var(--ink-dim);
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
    padding: 5px 14px;
  }
</style>
