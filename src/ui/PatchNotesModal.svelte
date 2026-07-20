<script lang="ts">
  import { patchOpen } from './game';
  import { PATCH_NOTES } from './patchNotes';

  // Index into the (newest-first) list. Only ONE patch is ever in the DOM, so the
  // list can grow to a thousand entries and the reader never lags.
  let i = $state(0);

  const total = PATCH_NOTES.length;
  const note = $derived(PATCH_NOTES[i]);
  const newest = $derived(i === 0);
  const oldest = $derived(i === total - 1);

  function newer() {
    if (i > 0) i -= 1;
  }
  function older() {
    if (i < total - 1) i += 1;
  }
</script>

<div class="overlay">
  <button class="backdrop" aria-label="Close patch notes" onclick={() => patchOpen.set(false)}></button>
  <div class="notes panel">
    <div class="panel-title">
      Chronicle of Changes
      <span class="count">{i + 1} / {total}</span>
    </div>

    <div class="body">
      <div class="stamp">
        <span class="ver">{note.version}</span>
        <span class="when">{note.date} · {note.time}</span>
      </div>
      <h3 class="title">{note.title}</h3>

      <ul class="changes">
        {#each note.changes as change}
          <li>{change}</li>
        {/each}
      </ul>
    </div>

    <div class="nav">
      <button class="btn" disabled={newest} onclick={newer}>← Newer</button>
      <span class="nav-mid faint">{newest ? 'Latest patch' : oldest ? 'First patch' : ''}</span>
      <button class="btn" disabled={oldest} onclick={older}>Older →</button>
    </div>

    <button class="btn primary close" onclick={() => patchOpen.set(false)}>Close</button>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(6, 4, 2, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 95;
    backdrop-filter: blur(2px);
  }
  .backdrop {
    position: absolute;
    inset: 0;
    background: transparent;
    border: none;
    cursor: default;
  }
  .notes {
    position: relative;
    max-width: 540px;
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
  }
  .panel-title {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .count {
    color: var(--ink-faint);
    font-size: 0.7rem;
    letter-spacing: 0.08em;
  }
  .body {
    padding: 16px 18px 8px;
    overflow-y: auto;
  }
  .stamp {
    display: flex;
    align-items: baseline;
    gap: 12px;
    flex-wrap: wrap;
  }
  .ver {
    color: var(--gold-bright);
    font-weight: 700;
    font-size: 1.05rem;
    letter-spacing: 0.04em;
  }
  .when {
    color: var(--ink-faint);
    font-size: 0.78rem;
  }
  .title {
    color: var(--ink);
    font-size: 1.1rem;
    margin: 8px 0 12px;
  }
  .changes {
    margin: 0;
    padding-left: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .changes li {
    color: var(--ink-dim);
    font-size: 0.9rem;
    line-height: 1.5;
  }
  .nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 12px 18px 4px;
  }
  .nav-mid {
    font-size: 0.74rem;
    text-align: center;
    flex: 1;
  }
  .close {
    margin: 8px 18px 18px;
    padding: 10px;
  }
</style>
