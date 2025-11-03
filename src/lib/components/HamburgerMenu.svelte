<script lang="ts">
  import { fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  type Props = {
    isOpen: boolean;
    menuItems: Array<{
      label?: string;
      action?: () => void;
      isSeparator?: boolean;
      isDanger?: boolean;
      isAutocheck?: boolean;
    }>;
    onToggle?: (isOpen: boolean) => void;
    onItemClick?: (item: any) => void;
    onBackdropClick?: () => void;
  };

  export let { isOpen, menuItems, onToggle, onItemClick, onBackdropClick }: Props = {
    isOpen: false,
    menuItems: [],
    onToggle: () => {},
    onItemClick: () => {},
    onBackdropClick: () => {}
  };

  function toggleMenu() {
    isOpen = !isOpen;
    onToggle?.(isOpen);
  }

  function handleItemClick(item: any) {
    item.action();
    isOpen = false;
    onItemClick?.(item);
  }

  function handleBackdropClick() {
    isOpen = false;
    onToggle?.(isOpen);
    onBackdropClick?.();
  }
</script>

<div class="relative">
  <!-- Hamburger Button -->
  <button
    on:click={toggleMenu}
    class="relative w-10 h-8 flex flex-col justify-center items-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded"
    aria-label={isOpen ? 'Close menu' : 'Open menu'}
    aria-expanded={isOpen}
  >
    <!-- Simple hamburger lines -->
    <span class="block w-6 h-0.5 bg-gray-800"></span>
    <span class="block w-6 h-0.5 bg-gray-800 mt-1.5"></span>
    <span class="block w-6 h-0.5 bg-gray-800 mt-1.5"></span>
  </button>

  <!-- Backdrop -->
  {#if isOpen}
    <div
      class="fixed inset-0 bg-black/25 z-40"
      on:click={handleBackdropClick}
      on:keydown={(e) => e.key === 'Escape' && handleBackdropClick()}
      role="button"
      tabindex="-1"
      aria-label="Close menu"
    ></div>
  {/if}

  <!-- Menu Dropdown -->
  {#if isOpen}
    <div
      class="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden"
      transition:fly={{ y: -10, duration: 200, easing: quintOut }}
    >
      <div class="py-2">
        {#each menuItems as item, index}
          {#if item.isSeparator}
            <div class="border-t border-gray-100 my-1"></div>
          {:else}
            <button
              on:click={() => handleItemClick(item)}
              class="w-full px-4 py-3 text-left text-sm font-medium transition-colors duration-150 flex items-center justify-between group"
              class:text-red-600={item.isDanger}
              class:hover:bg-gray-50={!item.isDanger}
              class:hover:bg-red-50={item.isDanger}
              class:text-gray-700={!item.isDanger}
            >
              <span>{item.label || ''}</span>
              {#if item.isAutocheck}
                <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>
              {/if}
            </button>
          {/if}
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  /* Ensure the menu appears above other elements */
  :global(.crossword-container) {
    position: relative;
    z-index: 1;
  }
</style>
