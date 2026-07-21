<script lang="ts">
  import { gameStore, actions, settingsOpen, devOpen } from './game';

  const game = gameStore;

  const GAMEPLAY = [
    { id: 'screenFlash', name: 'Danger screen flash', desc: 'Flash the screen red when starvation is costing you hearts.' },
    { id: 'coinMessages', name: 'Coin messages', desc: 'Log every copper you earn in the Chronicle.' },
    { id: 'idleMessages', name: 'Idle messages', desc: 'Log flavour lines for uneventful actions.' },
  ];
</script>

<div class="overlay">
  <button class="backdrop" aria-label="Close settings" onclick={() => settingsOpen.set(false)}></button>
  <div class="settings panel">
    <div class="panel-title">Settings</div>
    <div class="body">
      <div class="cat">Gameplay</div>
      {#each GAMEPLAY as opt}
        <label class="opt">
          <input
            type="checkbox"
            checked={$game.settings?.[opt.id] ?? true}
            onchange={() => actions.toggleSetting(opt.id)}
          />
          <span class="opt-text">
            <span class="opt-name">{opt.name}</span>
            <span class="opt-desc faint">{opt.desc}</span>
          </span>
        </label>
      {/each}

      <div class="cat dev-cat">Developer</div>
      <label class="opt">
        <input
          type="checkbox"
          checked={$devOpen}
          onchange={(e) => devOpen.set((e.currentTarget as HTMLInputElement).checked)}
        />
        <span class="opt-text">
          <span class="opt-name">Dev panel</span>
          <span class="opt-desc faint">Open the debug panel — god mode, coin, and faction cheats.</span>
        </span>
      </label>

      <button class="btn primary close" onclick={() => settingsOpen.set(false)}>Done</button>
    </div>
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
    z-index: 90;
    backdrop-filter: blur(2px);
  }
  .settings {
    max-width: 460px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  }
  .body {
    padding: 16px 18px 18px;
  }
  .cat {
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--gold);
    border-bottom: 1px solid var(--border);
    padding-bottom: 4px;
    margin-bottom: 10px;
  }
  .dev-cat {
    margin-top: 18px;
  }
  .opt {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 8px 0;
    cursor: pointer;
  }
  .opt input {
    width: 18px;
    height: 18px;
    margin-top: 2px;
    accent-color: var(--gold);
    cursor: pointer;
    flex-shrink: 0;
  }
  .opt-text {
    display: flex;
    flex-direction: column;
    line-height: 1.3;
  }
  .opt-name {
    font-size: 0.92rem;
  }
  .opt-desc {
    font-size: 0.78rem;
  }
  .close {
    width: 100%;
    margin-top: 14px;
    padding: 10px;
  }
</style>
