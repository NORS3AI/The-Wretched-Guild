<script lang="ts">
  import { gameStore, actions } from './game';
  import {
    MEMBER_JOBS,
    memberCanDo,
    incomeOf,
    jobById,
    maxMembers,
    hireCost,
    totalUpkeep,
    GUILD_MIN_RANK,
    REROLL_COST,
  } from '../engine/guild';
  import { alignmentName } from '../engine/alignment';

  const game = gameStore;
  $: run = $game.run;
  $: cap = maxMembers(run.rank);
  $: full = run.members.length >= cap;

  function memberIncome(m: (typeof run.members)[number]): number {
    const job = m.job ? jobById(m.job) : null;
    return job ? incomeOf(m, job) : 0;
  }
  $: grossIncome = run.members.reduce((s, m) => s + memberIncome(m), 0);
  $: netIncome = grossIncome - totalUpkeep(run);

  function onAssign(memberId: string, e: Event) {
    const val = (e.target as HTMLSelectElement).value;
    actions.assignMember(memberId, val === '' ? null : val);
  }
</script>

<div class="panel">
  <div class="panel-title">The Wretched Guild</div>
  <div class="body">
    {#if run.rank < GUILD_MIN_RANK}
      <p class="locked muted">
        No one follows a nobody. Rise to <strong>rank {GUILD_MIN_RANK}</strong> and
        wretches will come seeking the Guild's coin and protection.
      </p>
    {:else}
      <div class="summary">
        <span class="muted">{run.members.length}/{cap} sworn</span>
        <span class="net" class:loss={netIncome < 0}>
          net {netIncome >= 0 ? '+' : ''}{netIncome.toFixed(2)} <span class="faint">coin/tick</span>
        </span>
      </div>

      <!-- roster -->
      {#if run.members.length === 0}
        <p class="faint empty">The roster is empty. Take on a candidate below.</p>
      {:else}
        <div class="roster">
          {#each run.members as m (m.id)}
            <div class="member">
              <div class="m-head">
                <span class="m-name">{m.name}</span>
                <button class="dismiss" title="Cast out" onclick={() => actions.dismissMember(m.id)}>✕</button>
              </div>
              <div class="m-meta faint">
                {m.archetype} · {alignmentName(m.alignment)} · skill {m.skill.toFixed(0)}
                {#if m.heat > 0}· <span class="m-heat">heat {Math.round(m.heat)}</span>{/if}
              </div>
              <div class="m-controls">
                <select class="job-select" onchange={(e) => onAssign(m.id, e)}>
                  <option value="" selected={m.job === null}>— Idle —</option>
                  {#each MEMBER_JOBS as job}
                    <option value={job.id} selected={m.job === job.id} disabled={!memberCanDo(m, job)}>
                      {job.name}{memberCanDo(m, job) ? '' : ' (refuses)'}
                    </option>
                  {/each}
                </select>
                <span class="m-income">
                  {m.job ? `+${memberIncome(m).toFixed(2)}` : '—'}
                  <span class="faint">/ -{m.upkeep.toFixed(2)}</span>
                </span>
              </div>
            </div>
          {/each}
        </div>
      {/if}

      <!-- recruitment -->
      <div class="section-label">Candidates</div>
      <div class="recruits">
        {#each run.recruits as r (r.id)}
          {@const cost = hireCost(r)}
          {@const affordable = run.coin >= cost}
          <div class="recruit">
            <div class="r-info">
              <span class="r-name">{r.name}</span>
              <span class="r-meta faint">{r.archetype} · {alignmentName(r.alignment)} · skill {r.skill}</span>
            </div>
            <button
              class="btn"
              class:primary={!full && affordable}
              disabled={full || !affordable}
              title={full ? 'Roster is full' : !affordable ? 'Not enough coin' : ''}
              onclick={() => actions.recruitMember(r.id)}
            >
              Hire · {cost}
            </button>
          </div>
        {/each}
      </div>
      <button
        class="btn reroll"
        disabled={run.coin < REROLL_COST}
        onclick={() => actions.rerollRecruits()}
      >
        Post word for others ({REROLL_COST} coin)
      </button>
    {/if}
  </div>
</div>

<style>
  .body {
    padding: 12px 14px 14px;
  }
  .locked {
    font-size: 0.88rem;
    line-height: 1.6;
    margin: 4px 0;
  }
  .summary {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 10px;
  }
  .net {
    font-weight: 600;
    color: var(--green);
  }
  .net.loss {
    color: var(--blood-bright);
  }
  .empty {
    font-size: 0.82rem;
    font-style: italic;
    margin: 4px 0 0;
  }
  .roster {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .member {
    border: 1px solid var(--border);
    border-radius: 5px;
    padding: 9px 10px;
    background: var(--bg-panel-2);
  }
  .m-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .m-name {
    font-weight: 600;
    font-size: 0.94rem;
  }
  .dismiss {
    background: none;
    border: none;
    color: var(--ink-faint);
    font-size: 0.85rem;
    padding: 0 2px;
  }
  .dismiss:hover {
    color: var(--blood-bright);
  }
  .m-meta {
    font-size: 0.72rem;
    margin: 2px 0 7px;
  }
  .m-heat {
    color: var(--blood);
  }
  .m-controls {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .job-select {
    flex: 1;
    background: #0f0b07;
    color: var(--ink);
    border: 1px solid var(--border-light);
    border-radius: 4px;
    padding: 4px 6px;
    font-family: inherit;
    font-size: 0.82rem;
  }
  .m-income {
    font-size: 0.78rem;
    color: var(--green);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
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
  .recruits {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .recruit {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    padding: 7px 9px;
    border: 1px solid var(--border);
    border-radius: 5px;
  }
  .r-info {
    display: flex;
    flex-direction: column;
    line-height: 1.25;
  }
  .r-name {
    font-weight: 600;
    font-size: 0.9rem;
  }
  .r-meta {
    font-size: 0.72rem;
  }
  .recruit .btn {
    font-size: 0.8rem;
    white-space: nowrap;
  }
  .reroll {
    width: 100%;
    margin-top: 10px;
    font-size: 0.82rem;
  }
</style>
