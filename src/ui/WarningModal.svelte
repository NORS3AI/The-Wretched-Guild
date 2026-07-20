<script lang="ts">
  import { actions } from './game';

  let acknowledged = false;
</script>

<div class="overlay">
  <div class="warn panel">
    <div class="panel-title">A Word of Warning</div>
    <div class="body">
      <p class="lead">You are about to do something <strong>illicit</strong>.</p>
      <p>
        The world of the Wretched is a deadly one. If you are caught up in a crime —
        a theft, a contract, a killing — and it goes wrong, you can <strong>die</strong>.
        And death is <strong>permanent</strong>: your life ends, and this character
        is gone for good.
      </p>
      <p class="muted">
        The Guild endures and carries some Legacy onward, but the wretch you have
        built dies with the deed. Be careful out there.
      </p>

      <label class="ack">
        <input type="checkbox" bind:checked={acknowledged} />
        <span>I understand — if I die, the game ends.</span>
      </label>

      <button
        class="btn primary continue"
        disabled={!acknowledged}
        onclick={() => actions.acknowledgeIllicitWarning()}
      >
        Continue
      </button>
      <p class="once faint">You will only see this warning once.</p>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(6, 4, 2, 0.88);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 100;
    backdrop-filter: blur(2px);
  }
  .warn {
    max-width: 480px;
    width: 100%;
    border-color: var(--blood);
  }
  .warn .panel-title {
    color: var(--blood-bright);
    text-align: center;
  }
  .body {
    padding: 20px 22px 22px;
  }
  .lead {
    font-size: 1.05rem;
    margin: 0 0 12px;
  }
  .body p {
    margin: 0 0 12px;
    line-height: 1.6;
  }
  .ack {
    display: flex;
    align-items: center;
    gap: 9px;
    margin: 16px 0 14px;
    cursor: pointer;
    font-size: 0.92rem;
  }
  .ack input {
    width: 18px;
    height: 18px;
    accent-color: var(--gold);
    cursor: pointer;
  }
  .continue {
    width: 100%;
    padding: 11px;
    font-size: 1rem;
  }
  .once {
    text-align: center;
    margin: 10px 0 0;
    font-size: 0.76rem;
  }
</style>
