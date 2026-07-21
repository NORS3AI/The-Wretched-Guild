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
  import { illicitWarning, settingsOpen, patchOpen, activeTab } from './ui/game';
  import type { SideTab } from './ui/game';
  import { GAME_VERSION } from './ui/patchNotes';
  import { ownsAnyBusiness, ENTERPRISE_MIN_COIN } from './engine/businesses';
  import { GUILD_MIN_RANK } from './engine/guild';
  import LogPanel from './ui/LogPanel.svelte';
  import DeathScreen from './ui/DeathScreen.svelte';

  const game = gameStore;

  // Two of the side-tabs only appear once the player has earned their way in:
  // Enterprises once there's coin to invest, Wretched once the Guild opens.
  $: enterprisesUnlocked = $game.run.coin >= ENTERPRISE_MIN_COIN || ownsAnyBusiness($game.run);
  $: guildUnlocked = $game.run.rank >= GUILD_MIN_RANK;

  $: tabs = [
    { id: 'needs' as SideTab, label: 'Body & Needs', show: true },
    { id: 'enterprises' as SideTab, label: 'Enterprises', show: enterprisesUnlocked },
    { id: 'wretched' as SideTab, label: 'Wretched', show: guildUnlocked },
    { id: 'reputation' as SideTab, label: 'Reputation', show: true },
  ].filter((t) => t.show);

  // If the active tab has since become unavailable (e.g. a new life resets rank),
  // fall back to the always-present Body & Needs tab.
  $: effectiveTab = tabs.some((t) => t.id === $activeTab) ? $activeTab : 'needs';
</script>

<button class="version-badge" title="Chronicle of Changes" onclick={() => patchOpen.set(true)}>
  {GAME_VERSION}
</button>

<header class="masthead">
  <h1>The Wretched Guild</h1>
  <p class="tagline muted">From the gutter to the throne — and the shadow above it.</p>
</header>

<Topbar />

<div class="tabbar" role="tablist">
  {#each tabs as tab}
    <button
      class="tab"
      class:active={effectiveTab === tab.id}
      role="tab"
      aria-selected={effectiveTab === tab.id}
      onclick={() => activeTab.set(tab.id)}
    >
      {tab.label}
    </button>
  {/each}
</div>

<main class="layout">
  <aside class="col leftcol">
    <CharacterPanel />

    <div class="tabpanel">
      {#if effectiveTab === 'enterprises'}
        <BusinessesPanel />
      {:else if effectiveTab === 'wretched'}
        <GuildPanel />
      {:else if effectiveTab === 'reputation'}
        <ProgressPanel />
      {:else}
        <SurvivalPanel />
      {/if}
    </div>
  </aside>

  <section class="center col">
    {#if $game.run.stocksUntil !== null}
      <StocksPanel />
    {:else if $game.run.encounter}
      <EncounterView />
    {:else}
      {#if $game.run.merchantHere}
        <MerchantPanel />
      {/if}
      <ActivitiesPanel />
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
  /* Two columns — a fixed-width column for The Wretch and its tabbed panels,
     and a wide column for Ply Your Trade — with the Chronicle stretched across
     the full width beneath, like a long console. */
  .layout {
    display: grid;
    grid-template-columns: 300px minmax(0, 1fr);
    grid-template-areas:
      'left center'
      'log log';
    gap: 16px;
    margin-top: 16px;
    align-items: start;
  }
  /* every column must be allowed to shrink, or wide content overflows the page */
  .layout > * {
    min-width: 0;
  }
  .leftcol {
    grid-area: left;
  }
  .center {
    grid-area: center;
  }
  .rightcol {
    grid-area: log;
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
  /* the tab strip runs full-width beneath the top bar and switches the
     lower-left panel */
  .tabbar {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 12px;
  }
  .tab {
    flex: 1 1 auto;
    font-family: inherit;
    font-size: 0.72rem;
    letter-spacing: 0.04em;
    padding: 7px 8px;
    background: var(--bg-panel-2);
    border: 1px solid var(--border);
    border-radius: 5px;
    color: var(--ink-dim);
    cursor: pointer;
    white-space: nowrap;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
  }
  .tab:hover {
    border-color: var(--border-light);
    color: var(--ink);
  }
  .tab.active {
    border-color: var(--gold);
    color: var(--gold-bright);
    background: rgba(201, 162, 39, 0.1);
  }
  .tabpanel {
    min-width: 0;
  }
  /* Phones and iPad portrait: a single stacked column. */
  @media (max-width: 780px) {
    .layout {
      grid-template-columns: 1fr;
      grid-template-areas:
        'left'
        'center'
        'log';
    }
  }
</style>
