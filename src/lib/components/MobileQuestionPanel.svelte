<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let currentQuestion: any = null;
  export let direction: boolean = false; // false = across, true = down

  const dispatch = createEventDispatcher();

  function handlePrevious() {
    dispatch('previous');
  }

  function handleNext() {
    dispatch('next');
  }

  function handleToggleDirection() {
    dispatch('toggleDirection');
  }
</script>

<div class="jxword-single-question-container">
  <button class="jxword-arrow jxword-arrow-back" on:click={handlePrevious}>
    ‹
  </button>
  
  <div class="jxword-single-question" on:click={handleToggleDirection} on:keydown={(e) => e.key === 'Enter' && handleToggleDirection()} role="button" tabindex="0">
    {#if currentQuestion}
      <div class="question-text">
        {currentQuestion.question}
      </div>
      <div class="question-meta">
        {currentQuestion.num} • {direction ? 'Down' : 'Across'}
      </div>
    {:else}
      <div class="no-question">
        No question selected
      </div>
    {/if}
  </div>
  
  <button class="jxword-arrow jxword-arrow-forward" on:click={handleNext}>
    ›
  </button>
</div>

<style>
  .jxword-single-question-container {
    width: 100%;
    background-color: #b8ddec;
    display: flex;
    flex-direction: row;
    margin-top: 5px;
    align-items: center;
  }

  .jxword-arrow {
    font-size: 20px;
    padding: 8px 12px;
    cursor: pointer;
    min-width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.2);
    border: none;
    transition: background-color 0.2s;
  }

  .jxword-arrow:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .jxword-arrow:active {
    background: rgba(255, 255, 255, 0.4);
  }

  .jxword-single-question {
    padding: 12px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex-grow: 1;
    text-align: center;
  }

  .question-text {
    font-size: 14px;
    line-height: 1.4;
    margin-bottom: 4px;
  }

  .question-meta {
    font-size: 12px;
    color: #666;
    font-weight: bold;
  }

  .no-question {
    font-size: 14px;
    color: #666;
    font-style: italic;
  }

  @media only screen and (min-device-width: 480px) {
    .jxword-single-question-container {
      display: none;
    }
  }

  @media print {
    .jxword-single-question-container {
      display: none !important;
    }
  }
</style>
