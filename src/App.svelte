<script lang="ts">
  import { gameStore } from './ui/game';
  import Topbar from './ui/Topbar.svelte';
  import CharacterPanel from './ui/CharacterPanel.svelte';
  import ActivitiesPanel from './ui/ActivitiesPanel.svelte';
  import EncounterView from './ui/EncounterView.svelte';
  import LogPanel from './ui/LogPanel.svelte';
  import DeathScreen from './ui/DeathScreen.svelte';

  const game = gameStore;
</script>

<header class="masthead">
  <h1>The Wretched Guild</h1>
  <p class="tagline muted">From the gutter to the throne — and the shadow above it.</p>
</header>

<Topbar />

<main class="layout">
  <aside>
    <CharacterPanel />
  </aside>

  <section class="center">
    {#if $game.run.encounter}
      <EncounterView />
    {:else}
      <ActivitiesPanel />
    {/if}
  </section>

  <aside>
    <LogPanel />
  </aside>
</main>

{#if !$game.run.alive}
  <DeathScreen />
{/if}

<style>
  .masthead {
    text-align: center;
    padding: 22px 0 10px;
  }
  .masthead h1 {
    font-size: 2.1rem;
    color: var(--gold-bright);
    text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
  }
  .tagline {
    margin: 4px 0 0;
    font-style: italic;
    font-size: 0.95rem;
  }
  .layout {
    display: grid;
    grid-template-columns: 300px 1fr 320px;
    gap: 16px;
    margin-top: 16px;
    align-items: start;
  }
  .center {
    min-height: 420px;
  }
  @media (max-width: 980px) {
    .layout {
      grid-template-columns: 1fr;
    }
  }
</style>
