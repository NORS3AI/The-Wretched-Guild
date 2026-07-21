<script lang="ts">
  import { gameStore } from './ui/game';
  import Topbar from './ui/Topbar.svelte';
  import CharacterPanel from './ui/CharacterPanel.svelte';
  import SurvivalPanel from './ui/SurvivalPanel.svelte';
  import ProgressPanel from './ui/ProgressPanel.svelte';
  import ActivitiesPanel from './ui/ActivitiesPanel.svelte';
  import MerchantPanel from './ui/MerchantPanel.svelte';
  import ContractOffer from './ui/ContractOffer.svelte';
  import VendorPanel from './ui/VendorPanel.svelte';
  import BusinessesPanel from './ui/BusinessesPanel.svelte';
  import GuildPanel from './ui/GuildPanel.svelte';
  import ServantsPanel from './ui/ServantsPanel.svelte';
  import EncounterView from './ui/EncounterView.svelte';
  import StocksPanel from './ui/StocksPanel.svelte';
  import WarningModal from './ui/WarningModal.svelte';
  import FlashOverlay from './ui/FlashOverlay.svelte';
  import SettingsModal from './ui/SettingsModal.svelte';
  import PatchNotesModal from './ui/PatchNotesModal.svelte';
  import LegacyModal from './ui/LegacyModal.svelte';
  import DevPanel from './ui/DevPanel.svelte';
  import { illicitWarning, settingsOpen, patchOpen, legacyOpen, devOpen, activeTab } from './ui/game';
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
  $: householdUnlocked = $game.run.rank >= 50; // servants open at rank 50

  // The Events tab gathers everything that needs handling — encounters, the
  // stocks, and the wandering merchant. A red ! flags when any of them is waiting.
  $: eventsAlert =
    $game.run.encounter !== null ||
    $game.run.stocksUntil !== null ||
    $game.run.merchantHere ||
    $game.run.contractAvailable;
  // Body & Needs flags a red ! when any need has fallen to half or lower.
  $: needsAlert = Object.values($game.run.needs).some((v) => v <= 50);

  // The Wretch (attributes & skills) leads as its own tab. The Merchant tab is the
  // town shop — always present; it shows a "closed" sign outside 8am–6pm hours.
  $: tabs = [
    { id: 'wretch' as SideTab, label: 'The Wretch', show: true, alert: false },
    { id: 'events' as SideTab, label: 'Events', show: true, alert: eventsAlert },
    { id: 'trade' as SideTab, label: 'Ply Your Trade', show: true, alert: false },
    { id: 'merchant' as SideTab, label: 'Merchant', show: true, alert: false },
    { id: 'needs' as SideTab, label: 'Body & Needs', show: true, alert: needsAlert },
    { id: 'enterprises' as SideTab, label: 'Enterprises', show: enterprisesUnlocked, alert: false },
    { id: 'wretched' as SideTab, label: 'Wretched', show: guildUnlocked, alert: false },
    { id: 'household' as SideTab, label: 'Household', show: householdUnlocked, alert: false },
    { id: 'reputation' as SideTab, label: 'Reputation', show: true, alert: false },
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
      class:flag={tab.alert}
      role="tab"
      aria-selected={effectiveTab === tab.id}
      onclick={() => activeTab.set(tab.id)}
    >
      {tab.label}
      {#if tab.alert}<span class="alert-badge" title="Needs your attention">❗️</span>{/if}
    </button>
  {/each}
</div>

<main class="layout">
  <section class="center col tabpanel">
    {#if effectiveTab === 'events'}
      <!-- Everything that needs handling stacks here: the stocks, encounters
           (random events, accepted contracts, Rites of Passage), and the
           wandering merchant. The game auto-navigates here when one opens. -->
      {#if $game.run.stocksUntil !== null}
        <StocksPanel />
      {:else if $game.run.encounter}
        <EncounterView />
      {/if}
      {#if $game.run.contractAvailable}
        <ContractOffer />
      {/if}
      {#if $game.run.merchantHere}
        <MerchantPanel />
      {/if}
      {#if !eventsAlert}
        <div class="panel">
          <div class="panel-title">Events</div>
          <p class="no-events">No events right now.</p>
        </div>
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
    {:else if effectiveTab === 'household'}
      <ServantsPanel />
    {:else if effectiveTab === 'reputation'}
      <ProgressPanel />
    {:else}
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

{#if $devOpen}
  <DevPanel />
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
  /* a tab with something needing attention (Events waiting, a need at half) glows */
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
  .alert-badge {
    margin-left: 4px;
    font-size: 0.82rem;
    line-height: 1;
    vertical-align: middle;
  }
  .no-events {
    padding: 16px 14px;
    margin: 0;
    font-size: 0.86rem;
    font-style: italic;
    line-height: 1.55;
    color: var(--ink-dim);
  }
  .tabpanel {
    min-width: 0;
  }
</style>
