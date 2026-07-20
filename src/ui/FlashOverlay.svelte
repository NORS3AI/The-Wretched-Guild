<script lang="ts">
  import { dangerFlash } from './game';
  $: n = $dangerFlash;
</script>

{#key n}
  {#if n > 0}
    <div class="flash" aria-hidden="true"></div>
  {/if}
{/key}

<style>
  .flash {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 200;
    box-shadow: inset 0 0 140px 44px rgba(200, 40, 30, 0.9);
    animation: flashpulse 0.9s ease-out forwards;
  }
  @keyframes flashpulse {
    0% {
      opacity: 0;
    }
    12% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
</style>
