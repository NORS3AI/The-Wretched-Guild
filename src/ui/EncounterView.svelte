<script lang="ts">
  import { gameStore, actions } from './game';
  import { ENCOUNTERS } from '../engine/encounters';

  const game = gameStore;

  $: enc = $game.run.encounter;
  $: def = enc ? ENCOUNTERS[enc.defId] : null;
  $: node = enc && def ? def.nodes[enc.nodeId] : null;
  // random town events can simply be walked away from (contracts/rites can't)
  $: isEvent = !!enc && enc.defId.startsWith('event_');
</script>

{#if enc && def && node}
  <div class="panel encounter">
    <div class="panel-title">{def.title}</div>
    <div class="body">
      {#if enc.lastOutcomeText}
        <p class="narration">{enc.lastOutcomeText}</p>
      {/if}

      <p class="prompt">{node.text}</p>

      <div class="choices">
        {#each node.choices as choice, i}
          {@const eligible = !choice.gate || choice.gate($game.run)}
          <button
            class="choice"
            class:locked={!eligible}
            disabled={!eligible}
            title={eligible ? '' : choice.gateHint ?? 'You cannot do this — yet.'}
            onclick={() => actions.chooseEncounter(i)}
          >
            {#if choice.tag}<span class="tag" class:locked={!eligible}>{choice.tag}</span>{/if}
            <span class="choice-label">{choice.label}</span>
            {#if !eligible && choice.gateHint}
              <span class="lock-hint">— {choice.gateHint}</span>
            {/if}
          </button>
        {/each}
      </div>

      {#if isEvent}
        <button class="leave" onclick={() => actions.dismissEncounter()}>Leave — pay it no mind</button>
      {/if}
    </div>
  </div>
{/if}

<style>
  .encounter {
    border-color: var(--blood);
  }
  .encounter .panel-title {
    color: var(--blood-bright);
  }
  .body {
    padding: 18px;
  }
  .narration {
    margin: 0 0 14px;
    padding: 10px 14px;
    border-left: 3px solid var(--gold);
    background: rgba(201, 162, 39, 0.05);
    color: var(--ink-dim);
    font-style: italic;
  }
  .prompt {
    margin: 0 0 18px;
    font-size: 1.05rem;
    line-height: 1.6;
  }
  .choices {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }
  .choice {
    text-align: left;
    background: var(--bg-panel-2);
    border: 1px solid var(--border-light);
    border-radius: 5px;
    padding: 12px 14px;
    color: var(--ink);
    font-size: 0.95rem;
    transition: border-color 0.15s, background 0.15s, transform 0.05s;
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
  }
  .choice:hover:not(:disabled) {
    border-color: var(--gold);
    background: rgba(201, 162, 39, 0.06);
  }
  .choice:active:not(:disabled) {
    transform: translateY(1px);
  }
  .choice.locked {
    opacity: 0.5;
    cursor: not-allowed;
    border-style: dashed;
  }
  .tag {
    font-size: 0.7rem;
    letter-spacing: 0.06em;
    color: var(--gold-bright);
    border: 1px solid var(--border-light);
    border-radius: 3px;
    padding: 1px 6px;
    white-space: nowrap;
  }
  .tag.locked {
    color: var(--ink-faint);
  }
  .choice-label {
    flex: 1;
  }
  .lock-hint {
    font-size: 0.74rem;
    color: var(--ink-faint);
    font-style: italic;
  }
  .leave {
    margin-top: 14px;
    width: 100%;
    background: transparent;
    border: 1px solid var(--border-light);
    border-radius: 5px;
    color: var(--ink-dim);
    font-family: inherit;
    font-size: 0.82rem;
    padding: 9px;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }
  .leave:hover {
    border-color: var(--ink-dim);
    color: var(--ink);
  }
</style>
