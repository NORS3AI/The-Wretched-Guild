<script lang="ts">
  import { gameStore } from './ui/game';
  import Topbar from './ui/Topbar.svelte';
  import CharacterPanel from './ui/CharacterPanel.svelte';
  import SurvivalPanel from './ui/SurvivalPanel.svelte';
  import ProgressPanel from './ui/ProgressPanel.svelte';
  import ActivitiesPanel from './ui/ActivitiesPanel.svelte';
  import MerchantPanel from './ui/MerchantPanel.svelte';
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
        {#if $game.run.merchantUntil > $game.run.tick}
          <MerchantPanel />
        {/if}
        <ActivitiesPanel />
        <BusinessesPanel />
        <GuildPanel />
      </div>
    {/if}
  </section>

  <aside class="rightcol">
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
    grid-template-columns: 300px minmax(0, 1fr) 320px;
    gap: 16px;
    margin-top: 16px;
    align-items: start;
  }
  /* every column must be allowed to shrink, or wide content overflows the page */
  .layout > * {
    min-width: 0;
  }
  .col {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
  }
  .center {
    min-height: 420px;
    min-width: 0;
  }
  /* Tablets (incl. iPad landscape): drop to two columns and float the Chronicle
     full-width beneath, so nothing spills past the screen edge. */
  @media (max-width: 1120px) {
    .layout {
      grid-template-columns: 280px minmax(0, 1fr);
    }
    .rightcol {
      grid-column: 1 / -1;
    }
  }
  /* Phones and iPad portrait: a single stacked column. */
  @media (max-width: 780px) {
    .layout {
      grid-template-columns: 1fr;
    }
  }
</style>
