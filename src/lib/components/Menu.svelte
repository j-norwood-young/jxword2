<script lang="ts">
    import { Menu, X } from 'lucide-svelte';
    
    type Props = {
        onReset: () => void;
        onInstructions: () => void;
    }
    const { onReset, onInstructions }: Props = $props();

    let showMenu = $state(false);

    function handleReset() {
        onReset();
        showMenu = false;
    }

    function handleInstructions() {
        onInstructions();
        showMenu = false;
    }

    function toggleMenu() {
        showMenu = !showMenu;
    }
</script>

<nav class="relative z-30">
    <!-- Menu Button -->
    <button
        onclick={toggleMenu}
        class="relative p-2 rounded-lg bg-white shadow-md border border-gray-200 hover:shadow-lg transition-all duration-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="Toggle menu"
        aria-expanded={showMenu}
    >
        <div class="w-6 h-6 flex flex-col justify-center items-center">
            {#if showMenu}
                <X class="w-5 h-5 text-gray-700 transition-transform duration-200" />
            {:else}
                <Menu class="w-5 h-5 text-gray-700 transition-transform duration-200" />
            {/if}
        </div>
    </button>

    <!-- Menu Dropdown -->
    {#if showMenu}
        <div class="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden transform transition-all duration-200 ease-out opacity-100 translate-y-0 z-30">
            <div class="py-2">
                <button
                    onclick={handleInstructions}
                    class="w-full px-4 py-3 text-left text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 flex items-center space-x-3"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span class="font-medium">Instructions</span>
                </button>
                
                <div class="border-t border-gray-100 my-1"></div>
                
                <button
                    onclick={handleReset}
                    class="w-full px-4 py-3 text-left text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors duration-150 flex items-center space-x-3"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    <span class="font-medium">Reset</span>
                </button>
            </div>
        </div>
    {/if}

    <!-- Backdrop for mobile -->
    {#if showMenu}
        <div 
            class="fixed inset-0 bg-black/25 z-20"
            onclick={toggleMenu}
            role="button"
            tabindex="0"
            onkeydown={(e) => e.key === 'Escape' && toggleMenu()}
        ></div>
    {/if}
</nav>
