<script lang="ts">
  import { gameStore } from './game';

  const game = gameStore;

  // Auto-scroll to the newest entry via a self-contained action — decoupled from
  // the reactive graph so it can never feed back into an update loop.
  function autoscroll(node: HTMLElement) {
    const toBottom = () => (node.scrollTop = node.scrollHeight);
    const obs = new MutationObserver(toBottom);
    obs.observe(node, { childList: true, subtree: true });
    toBottom();
    return { destroy: () => obs.disconnect() };
  }
</script>

<div class="panel log-panel">
  <div class="panel-title">Chronicle</div>
  <div class="log scroll" use:autoscroll>
    {#each $game.log as entry}
      <div class="entry {entry.kind}">
        <span class="day faint">d{Math.floor(entry.tick / 24) + 1}</span>
        <span class="text">{entry.text}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .log-panel {
    display: flex;
    flex-direction: column;
    height: 520px;
  }
  .log {
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 7px;
    flex: 1;
  }
  .entry {
    display: flex;
    gap: 8px;
    font-size: 0.82rem;
    line-height: 1.4;
    padding-bottom: 6px;
    border-bottom: 1px dotted var(--border);
  }
  .day {
    font-size: 0.66rem;
    flex-shrink: 0;
    padding-top: 2px;
    font-variant-numeric: tabular-nums;
  }
  .text {
    color: var(--ink-dim);
  }
  .entry.good .text {
    color: var(--green);
  }
  .entry.coin .text {
    color: var(--gold);
  }
  .entry.bad .text {
    color: var(--blood-bright);
  }
  .entry.align .text {
    color: #9a7fc0;
  }
  .entry.death .text {
    color: var(--blood-bright);
    font-weight: 600;
  }
  .entry.system .text {
    color: var(--ink);
    font-style: italic;
  }
</style>
