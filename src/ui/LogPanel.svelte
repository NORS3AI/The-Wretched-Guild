<script lang="ts">
  import { gameStore, actions } from './game';

  const game = gameStore;

  // Filter the log by the message settings (coin / idle-flavour lines).
  $: entries = $game.log.filter((e) => {
    if (e.kind === 'coin' && $game.settings?.coinMessages === false) return false;
    if (e.kind === 'plain' && $game.settings?.idleMessages === false) return false;
    return true;
  });

  // Auto-scroll to the newest entry — but ONLY when the reader is already at the
  // bottom. If they've scrolled up to read older history, new lines no longer
  // yank them back down, so the whole Chronicle stays reviewable.
  function autoscroll(node: HTMLElement) {
    const atBottom = () => node.scrollHeight - node.scrollTop - node.clientHeight < 40;
    let stick = true;
    const onScroll = () => (stick = atBottom());
    node.addEventListener('scroll', onScroll, { passive: true });
    const obs = new MutationObserver(() => {
      if (stick) node.scrollTop = node.scrollHeight;
    });
    obs.observe(node, { childList: true, subtree: true });
    node.scrollTop = node.scrollHeight;
    return {
      destroy: () => {
        obs.disconnect();
        node.removeEventListener('scroll', onScroll);
      },
    };
  }
</script>

<div class="panel log-panel">
  <div class="panel-title">
    Chronicle
    <button class="clear" title="Clear the Chronicle" disabled={entries.length === 0} onclick={() => actions.clearLog()}>
      Clear
    </button>
  </div>
  <div class="log scroll" use:autoscroll>
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
    height: 520px;
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
