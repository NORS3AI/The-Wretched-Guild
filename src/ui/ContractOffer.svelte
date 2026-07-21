<script lang="ts">
  import { gameStore, actions } from './game';
  import { CONTRACTS, contractById, contractPay } from '../engine/contracts';

  const game = gameStore;

  // The waiting mark, so the offer names who the Guild wants dealt with — and
  // what it pays at the player's current rank (higher rank, weightier fee).
  $: mark = $game.run.contractTargetId ? CONTRACTS[$game.run.contractTargetId] : null;
  $: markTarget = $game.run.contractTargetId ? contractById($game.run.contractTargetId) : null;
  $: markFee = markTarget ? contractPay(markTarget, $game.run.rank) : null;
</script>

<div class="panel contract">
  <div class="panel-title">A Whisper in the Dark</div>
  <div class="contract-body">
    <p class="muted">
      A hooded factor of the Shadow Guild waits for you. There is bloody work —
      {#if mark}a mark called <strong class="markname">{mark.title}</strong> — {/if}worth
      {#if markFee}<strong class="markfee">{markFee} copper</strong>{:else}good coin{/if} at your standing.
      The offer keeps; open it whenever you like and slip away to decide later.
    </p>
    <div class="contract-actions">
      <button class="btn primary" onclick={() => actions.acceptContract()}>
        Read the Contract →
      </button>
      <button class="btn" onclick={() => actions.declineContract()}>
        Leave
      </button>
    </div>
  </div>
</div>

<style>
  .contract {
    border-color: var(--blood);
  }
  .contract .panel-title {
    color: var(--blood-bright);
  }
  .contract-body {
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  .contract-body p {
    margin: 0;
  }
  .markname {
    color: var(--blood-bright);
    font-style: italic;
  }
  .markfee {
    color: var(--gold-bright);
  }
  .contract-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }
</style>
