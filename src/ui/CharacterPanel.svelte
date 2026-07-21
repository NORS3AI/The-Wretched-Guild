<script lang="ts">
  import { gameStore } from './game';
  import { SKILLS } from '../engine/skills';

  // show a skill only once the player has used it at least once (value > 0)
  $: discoveredSkills = SKILLS.filter((sk) => ($game.run.skills[sk.id] ?? 0) > 0);

  const game = gameStore;

  // Cunning, Charm, Piety, and Vitality are hidden for now — kept out of the
  // Attributes list until they come into play later.
  const attrRows = [
    { key: 'brawn', label: 'Brawn' },
    { key: 'stealth', label: 'Stealth' },
    { key: 'wits', label: 'Wits' },
    { key: 'luck', label: 'Luck' },
  ] as const;
</script>

<div class="panel">
  <div class="panel-title">The Wretch</div>
  <div class="body">
    <!-- attributes -->
    <div class="section-label first">Attributes</div>
    <div class="attrs">
      {#each attrRows as row}
        <div class="attr">
          <span class="attr-name">{row.label}</span>
          <div class="bar slim">
            <div class="fill attr-fill" style="width:{$game.run.attrs[row.key]}%"></div>
          </div>
          <span class="attr-val">{$game.run.attrs[row.key].toFixed(1)}</span>
        </div>
      {/each}
    </div>

    <!-- skills — only those the wretch has actually discovered by doing -->
    {#if discoveredSkills.length > 0}
      <div class="section-label">Skills</div>
      <div class="skills">
        {#each discoveredSkills as sk}
          <div class="skill" title={sk.blurb}>
            <span class="skill-name">{sk.name}</span>
            <span class="skill-lvl">{Math.floor($game.run.skills[sk.id] ?? 0)}%</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .body {
    padding: 14px;
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
  .section-label.first {
    margin-top: 0;
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
  .skills {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 5px 10px;
  }
  .skill {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 0.8rem;
  }
  .skill-name {
    color: var(--ink-dim);
  }
  .skill-lvl {
    color: var(--gold);
    font-variant-numeric: tabular-nums;
  }
</style>
