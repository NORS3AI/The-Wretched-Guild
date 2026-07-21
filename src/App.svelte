<script lang="ts">
  import { gameStore } from './ui/game';
  import Topbar from './ui/Topbar.svelte';
  import CharacterPanel from './ui/CharacterPanel.svelte';
  import SurvivalPanel from './ui/SurvivalPanel.svelte';
  import ProgressPanel from './ui/ProgressPanel.svelte';
  import ActivitiesPanel from './ui/ActivitiesPanel.svelte';
  import MerchantPanel from './ui/MerchantPanel.svelte';
  import VendorPanel from './ui/VendorPanel.svelte';
  import BusinessesPanel from './ui/BusinessesPanel.svelte';
  import GuildPanel from './ui/GuildPanel.svelte';
  import EncounterView from './ui/EncounterView.svelte';
  import StocksPanel from './ui/StocksPanel.svelte';
  import WarningModal from './ui/WarningModal.svelte';
  import FlashOverlay from './ui/FlashOverlay.svelte';
  import SettingsModal from './ui/SettingsModal.svelte';
  import PatchNotesModal from './ui/PatchNotesModal.svelte';
  import LegacyModal from './ui/LegacyModal.svelte';
  import { illicitWarning, settingsOpen, patchOpen, legacyOpen, activeTab } from './ui/game';
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

  // An Events tab appears only while an encounter or the stocks is active — the
  // game whisks the player to it automatically (see game.ts).
  $: eventActive = $game.run.encounter !== null || $game.run.stocksUntil !== null;

  // The Wretch (attributes & skills) leads as its own tab. The Merchant tab is the
  // town shop — always present; it shows a "closed" sign outside 8am–6pm hours.
  $: tabs = [
    { id: 'wretch' as SideTab, label: 'The Wretch', show: true, flag: false },
    { id: 'events' as SideTab, label: 'Events', show: eventActive, flag: true },
    { id: 'trade' as SideTab, label: 'Ply Your Trade', show: true, flag: false },
    { id: 'merchant' as SideTab, label: 'Merchant', show: true, flag: false },
    { id: 'needs' as SideTab, label: 'Body & Needs', show: true, flag: false },
    { id: 'enterprises' as SideTab, label: 'Enterprises', show: enterprisesUnlocked, flag: false },
    { id: 'wretched' as SideTab, label: 'Wretched', show: guildUnlocked, flag: false },
    { id: 'reputation' as SideTab, label: 'Reputation', show: true, flag: false },
  ].filter((t) => t.show);

  // If the active tab has since become unavailable (e.g. a new life resets rank),
  // fall back to the always-present The Wretch view.
  $: effectiveTab = tabs.some((t) => t.id === $activeTab) ? $activeTab : 'wretch';
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
      class:flag={tab.flag}
      role="tab"
      aria-selected={effectiveTab === tab.id}
      onclick={() => activeTab.set(tab.id)}
    >
      {tab.label}
    </button>
  {/each}
</div>

<main class="layout">
  <section class="center col tabpanel">
    {#if effectiveTab === 'events'}
      <!-- Events, accepted contracts, Rites of Passage, and the stocks all live
           on their own tab; the game auto-navigates here when one opens. -->
      {#if $game.run.stocksUntil !== null}
        <StocksPanel />
      {:else if $game.run.encounter}
        <EncounterView />
      {/if}
    {:else if effectiveTab === 'wretch'}
      <CharacterPanel />
    {:else if effectiveTab === 'merchant'}
      <VendorPanel />
    {:else if effectiveTab === 'needs'}
      <SurvivalPanel />
    {:else if effectiveTab === 'enterprises'}
      <BusinessesPanel />
    {:else if effectiveTab === 'wretched'}
      <GuildPanel />
    {:else if effectiveTab === 'reputation'}
      <ProgressPanel />
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

{#if $legacyOpen}
  <LegacyModal />
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
  /* A single main column carrying the active tab, with the Chronicle stretched
     across the full width beneath it, like a long console. */
  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'center'
      'log';
    gap: 16px;
    margin-top: 16px;
    align-items: start;
  }
  /* every column must be allowed to shrink, or wide content overflows the page */
  .layout > * {
    min-width: 0;
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
  /* the Events tab, present only while something demands attention, draws the eye */
  .tab.flag:not(.active) {
    border-color: var(--blood);
    color: var(--blood-bright);
    animation: tabflag 1.4s ease-in-out infinite;
  }
  @keyframes tabflag {
    0%,
    100% {
      box-shadow: 0 0 0 0 rgba(140, 47, 47, 0);
    }
    50% {
      box-shadow: 0 0 8px 1px rgba(160, 60, 55, 0.5);
    }
  }
  .tabpanel {
    min-width: 0;
  }
</style>
