<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  function handleKeyPress(key: string) {
    dispatch('keypress', { key });
  }

  function handleBackspace() {
    dispatch('keypress', { key: 'BACKSPACE' });
  }

  const keyboardRows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ];
</script>

<div class="jxword-keyboard">
  {#each keyboardRows as row}
    <div class="jxword-keyboard-row">
      {#each row as key}
        <button 
          class="jxword-key" 
          on:click={() => handleKeyPress(key)}
          on:keydown={(e) => e.preventDefault()}
        >
          {key}
        </button>
      {/each}
      {#if row === keyboardRows[keyboardRows.length - 1]}
        <button 
          class="jxword-key jxword-key-backspace" 
          on:click={handleBackspace}
          on:keydown={(e) => e.preventDefault()}
        >
          ←
        </button>
      {/if}
    </div>
  {/each}
</div>

<style>
  @media only screen and (min-device-width: 480px) {
    .jxword-keyboard {
      display: none;
    }
  }

  @media print {
    .jxword-keyboard {
      display: none !important;
    }
  }
</style>
