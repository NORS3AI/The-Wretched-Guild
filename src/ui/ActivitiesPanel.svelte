<script lang="ts">
  import { gameStore, actions } from './game';
  import { ACTIVITIES } from '../engine/activities';
  import { ownsAnyBusiness } from '../engine/businesses';
  import { REAL_MS_PER_TICK } from '../engine/timeconst';
  import { CONTRACTS } from '../engine/contracts';

  const game = gameStore;

  // The waiting mark, so the offer names who the Guild wants dealt with.
  $: mark = $game.run.contractTargetId ? CONTRACTS[$game.run.contractTargetId] : null;

  // Once you own an enterprise, the begging life is behind you — drop it.
  $: trades = ACTIVITIES.filter((a) => !(a.id === 'beg' && ownsAnyBusiness($game.run)));

  // The fill glides smoothly over each cycle's real duration (ticks × tick time,
  // divided by speed) via a CSS animation, rather than jumping per tick.
  function fillDurationMs(id: string): number {
    const def = ACTIVITIES.find((a) => a.id === id);
    const ticks = def?.ticks ?? 1;
    return (ticks * REAL_MS_PER_TICK) / Math.max(1, $game.speed);
  }
</script>

<div class="stack">
  {#if $game.run.contractAvailable}
    <div class="panel contract">
      <div class="panel-title">A Whisper in the Dark</div>
      <div class="contract-body">
        <p class="muted">
          A hooded factor of the Shadow Guild waits for you. There is bloody work —
          {#if mark}a mark called <strong class="markname">{mark.title}</strong> — {/if}and
          coppers for the doing of it. The offer keeps; open it whenever you like and
          slip away to decide later.
        </p>
        <button class="btn primary" onclick={() => actions.acceptContract()}>
          Read the Contract →
        </button>
      </div>
    </div>
  {/if}

  <div class="panel">
    <div class="panel-title">Ply Your Trade</div>
    <div class="acts">
      {#each trades as act}
        {@const active = $game.run.activity?.id === act.id}
        <button
          class="act"
          class:active
          onclick={() => actions.setActivity(active ? null : act.id)}
        >
          <div class="act-head">
            <span class="act-name">{act.name}</span>
            <span class="act-head-right">
              {#if act.earns}<span class="act-earns" title="Copper earned per cycle">{act.earns}</span>{/if}
              <span class="act-path">{act.path}</span>
            </span>
          </div>
          <p class="act-blurb">{act.blurb}</p>
          <div class="act-bar">
            {#if active}
              <div
                class="act-fill filling"
                style="animation-duration:{fillDurationMs(act.id)}ms; animation-play-state:{$game.paused ? 'paused' : 'running'}"
              ></div>
            {:else}
              <div class="act-fill"></div>
            {/if}
          </div>
          <div class="act-status">
            {active ? 'Working… (click to stop)' : 'Idle'}
          </div>
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  .stack {
    display: flex;
    flex-direction: column;
    gap: 16px;
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
  .contract {
    border-color: var(--blood);
  }
  .contract .panel-title {
    color: var(--blood-bright);
  }
  .markname {
    color: var(--blood-bright);
    font-style: italic;
  }
  .acts {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    padding: 12px;
  }
  @media (max-width: 560px) {
    .acts {
      grid-template-columns: 1fr;
    }
  }
  .act {
    text-align: left;
    background: var(--bg-panel-2);
    border: 1px solid var(--border);
    border-radius: 5px;
    padding: 11px 12px;
    color: var(--ink);
    transition: border-color 0.15s, background 0.15s;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .act:hover {
    border-color: var(--border-light);
  }
  .act.active {
    border-color: var(--gold);
    background: rgba(201, 162, 39, 0.07);
  }
  .act-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }
  .act-name {
    font-weight: 600;
    font-size: 0.98rem;
  }
  .act-head-right {
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-shrink: 0;
  }
  .act-earns {
    font-size: 0.66rem;
    color: var(--gold);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .act-path {
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--ink-faint);
  }
  .act-blurb {
    margin: 0;
    font-size: 0.78rem;
    color: var(--ink-dim);
    min-height: 2.4em;
  }
  .act-bar {
    height: 5px;
    background: #0f0b07;
    border-radius: 3px;
    overflow: hidden;
  }
  .act-fill {
    height: 100%;
    width: 0;
    background: var(--gold);
  }
  .act-fill.filling {
    animation-name: fill;
    animation-timing-function: linear;
    animation-iteration-count: infinite;
  }
  @keyframes fill {
    from {
      width: 0;
    }
    to {
      width: 100%;
    }
  }
  .act-status {
    font-size: 0.68rem;
    color: var(--ink-faint);
  }
</style>
