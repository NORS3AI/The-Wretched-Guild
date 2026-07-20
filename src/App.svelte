<script lang="ts">
  import { gameStore } from './ui/game';
  import Topbar from './ui/Topbar.svelte';
  import CharacterPanel from './ui/CharacterPanel.svelte';
  import SurvivalPanel from './ui/SurvivalPanel.svelte';
  import ProgressPanel from './ui/ProgressPanel.svelte';
  import ActivitiesPanel from './ui/ActivitiesPanel.svelte';
  import BusinessesPanel from './ui/BusinessesPanel.svelte';
  import GuildPanel from './ui/GuildPanel.svelte';
  import EncounterView from './ui/EncounterView.svelte';
  import StocksPanel from './ui/StocksPanel.svelte';
  import WarningModal from './ui/WarningModal.svelte';
  import FlashOverlay from './ui/FlashOverlay.svelte';
  import SettingsModal from './ui/SettingsModal.svelte';
  import PatchNotesModal from './ui/PatchNotesModal.svelte';
  import { illicitWarning, settingsOpen, patchOpen } from './ui/game';
  import { GAME_VERSION } from './ui/patchNotes';
  import LogPanel from './ui/LogPanel.svelte';
  import DeathScreen from './ui/DeathScreen.svelte';

  const game = gameStore;
</script>

<button class="version-badge" title="Chronicle of Changes" onclick={() => patchOpen.set(true)}>
  {GAME_VERSION}
</button>

<header class="masthead">
  <h1>The Wretched Guild</h1>
  <p class="tagline muted">From the gutter to the throne — and the shadow above it.</p>
</header>

<Topbar />

<main class="layout">
  <aside class="col">
    <CharacterPanel />
    <SurvivalPanel />
    <ProgressPanel />
  </aside>

  <section class="center">
    {#if $game.run.stocksUntil !== null}
      <StocksPanel />
    {:else if $game.run.encounter}
      <EncounterView />
    {:else}
      <div class="col">
        <ActivitiesPanel />
        <BusinessesPanel />
        <GuildPanel />
      </div>
    {/if}
  </section>

  <aside>
    <LogPanel />
  </aside>
</main>

{#if !$game.run.alive}
  <DeathScreen />
{/if}

{#if $illicitWarning}
  <WarningModal />
{/if}

{#if $settingsOpen}
  <SettingsModal />
{/if}

{#if $patchOpen}
  <PatchNotesModal />
{/if}

<FlashOverlay />

<style>
  .version-badge {
    position: fixed;
    top: 8px;
    right: 10px;
    z-index: 80;
    background: rgba(10, 7, 4, 0.7);
    color: var(--gold);
    border: 1px solid var(--border-light);
    border-radius: 4px;
    padding: 3px 9px;
    font-family: inherit;
    font-size: 0.72rem;
    letter-spacing: 0.06em;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }
  .version-badge:hover {
    color: var(--gold-bright);
    border-color: var(--gold);
  }
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
  .col {
    display: flex;
    flex-direction: column;
    gap: 16px;
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
