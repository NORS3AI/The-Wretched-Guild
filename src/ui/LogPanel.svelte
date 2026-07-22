<script lang="ts">
  import { gameStore, actions } from './game';

  const game = gameStore;

  // Filter the log by the message settings (coin / idle-flavour lines), then show
  // only the newest ten, newest FIRST (top to bottom).
  $: entries = $game.log
    .filter((e) => {
      if (e.kind === 'coin' && $game.settings?.coinMessages === false) return false;
      if (e.kind === 'plain' && $game.settings?.idleMessages === false) return false;
      return true;
    })
    .slice(-10)
    .reverse();

</script>

<div class="panel log-panel">
  <div class="panel-title">
    Chronicler
    <button class="clear" title="Clear the Chronicler" disabled={entries.length === 0} onclick={() => actions.clearLog()}>
      Clear
    </button>
  </div>
  <div class="log">
    {#each entries as entry}
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
    height: 300px;
  }
  .log-panel .panel-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .clear {
    font-family: inherit;
    background: transparent;
    border: 1px solid var(--border-light);
    border-radius: 4px;
    color: var(--ink-dim);
    font-size: 0.62rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 2px 8px;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }
  .clear:hover:not(:disabled) {
    border-color: var(--blood-bright);
    color: var(--blood-bright);
  }
  .clear:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  .log {
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start; /* newest entries pinned to the top */
    gap: 7px;
    flex: 1;
    overflow: hidden; /* no scrolling — older lines simply fall off the bottom */
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
