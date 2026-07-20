<script lang="ts">
  import { gameStore } from './game';
  import { ethicsBand, moralsBand } from '../engine/alignment';

  const game = gameStore;

  const attrRows = [
    { key: 'cunning', label: 'Cunning' },
    { key: 'brawn', label: 'Brawn' },
    { key: 'charm', label: 'Charm' },
    { key: 'stealth', label: 'Stealth' },
    { key: 'piety', label: 'Piety' },
    { key: 'wits', label: 'Wits' },
  ] as const;

  // map axis value [-100,100] -> [0,100] for a centered bar
  function axisPct(v: number): number {
    return (v + 100) / 2;
  }
</script>

<div class="panel">
  <div class="panel-title">The Wretch</div>
  <div class="body">
    <!-- vitals -->
    <div class="vital">
      <div class="vital-head">
        <span>Health</span>
        <span class="muted">{Math.max(0, Math.round($game.run.health))}/{$game.run.maxHealth}</span>
      </div>
      <div class="bar">
        <div
          class="fill health"
          style="width:{Math.max(0, Math.min(100, ($game.run.health / $game.run.maxHealth) * 100))}%"
        ></div>
      </div>
    </div>

    <div class="vital">
      <div class="vital-head">
        <span>Heat</span>
        <span class="muted">{Math.round($game.run.heat)}/100</span>
      </div>
      <div class="bar">
        <div class="fill heat" style="width:{Math.min(100, $game.run.heat)}%"></div>
      </div>
    </div>

    <!-- alignment -->
    <div class="section-label">Bearing</div>
    <div class="axis">
      <div class="axis-ends"><span>Chaotic</span><span class="tag">{ethicsBand($game.run.alignment)}</span><span>Lawful</span></div>
      <div class="bar center">
        <div class="tick"></div>
        <div class="marker" style="left:{axisPct($game.run.alignment.ethics)}%"></div>
      </div>
    </div>
    <div class="axis">
      <div class="axis-ends"><span>Evil</span><span class="tag">{moralsBand($game.run.alignment)}</span><span>Good</span></div>
      <div class="bar center">
        <div class="tick"></div>
        <div class="marker" style="left:{axisPct($game.run.alignment.morals)}%"></div>
      </div>
    </div>

    <!-- attributes -->
    <div class="section-label">Attributes</div>
    <div class="attrs">
      {#each attrRows as row}
        <div class="attr">
          <span class="attr-name">{row.label}</span>
          <div class="bar slim">
            <div class="fill attr-fill" style="width:{($game.run.attrs[row.key] / 40) * 100}%"></div>
          </div>
          <span class="attr-val">{$game.run.attrs[row.key].toFixed(1)}</span>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .body {
    padding: 14px;
  }
  .vital {
    margin-bottom: 12px;
  }
  .vital-head {
    display: flex;
    justify-content: space-between;
    font-size: 0.82rem;
    margin-bottom: 4px;
  }
  .bar {
    position: relative;
    height: 10px;
    background: #0f0b07;
    border: 1px solid var(--border);
    border-radius: 5px;
    overflow: hidden;
  }
  .bar.slim {
    height: 8px;
  }
  .fill {
    height: 100%;
    transition: width 0.3s ease;
  }
  .fill.health {
    background: linear-gradient(90deg, #7a2a2a, #b34a3f);
  }
  .fill.heat {
    background: linear-gradient(90deg, #8a6a1e, #d0913a);
  }
  .fill.attr-fill {
    background: linear-gradient(90deg, #55702f, #86a94e);
  }
  .section-label {
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--gold);
    margin: 16px 0 8px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 4px;
  }
  .axis {
    margin-bottom: 12px;
  }
  .axis-ends {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.68rem;
    color: var(--ink-faint);
    margin-bottom: 3px;
  }
  .axis-ends .tag {
    color: var(--ink);
    font-size: 0.72rem;
    letter-spacing: 0.05em;
  }
  .bar.center {
    overflow: visible;
    background: linear-gradient(90deg, #2a1414, #0f0b07 50%, #16220f);
  }
  .tick {
    position: absolute;
    left: 50%;
    top: -2px;
    bottom: -2px;
    width: 1px;
    background: var(--border-light);
  }
  .marker {
    position: absolute;
    top: 50%;
    width: 9px;
    height: 9px;
    background: var(--gold-bright);
    border: 1px solid #0f0b07;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    transition: left 0.4s ease;
    box-shadow: 0 0 5px rgba(232, 195, 74, 0.6);
  }
  .attrs {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .attr {
    display: grid;
    grid-template-columns: 62px 1fr 34px;
    align-items: center;
    gap: 8px;
    font-size: 0.82rem;
  }
  .attr-name {
    color: var(--ink-dim);
  }
  .attr-val {
    text-align: right;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
  }
</style>
