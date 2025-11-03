<script lang="ts">
    import { X, HelpCircle, Keyboard, Lightbulb, AlertCircle } from 'lucide-svelte';
    import { fade, scale } from 'svelte/transition';
    
    export let visible: boolean = false;
    
    function hideInstructions() {
        visible = false;
    }
    
    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            hideInstructions();
        }
    }
    
    function handleBackdropClick(e: MouseEvent) {
        if (e.target === e.currentTarget) {
            hideInstructions();
        }
    }
</script>

{#if visible}
    <!-- Modal backdrop -->
    <div 
        class="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
        onclick={handleBackdropClick}
        onkeydown={handleKeydown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="instructions-title"
        tabindex="-1"
        transition:fade={{ duration: 200 }}
    >
        <!-- Modal content -->
        <div 
            class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            transition:scale={{ duration: 300, start: 0.95 }}
        >
            <!-- Modal header -->
            <div class="flex items-center justify-between p-6 border-b border-gray-200 bg-blue-50">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center">
                        <HelpCircle size={20} />
                    </div>
                    <div>
                        <h2 id="instructions-title" class="text-xl font-semibold text-gray-900">
                            Instructions
                        </h2>
                        <p class="text-sm text-gray-600">
                            How to use the Crossword Creator
                        </p>
                    </div>
                </div>
                <button
                    onclick={hideInstructions}
                    class="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Close instructions"
                >
                    <X size={24} />
                </button>
            </div>
            
            <!-- Modal body -->
            <div class="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                <!-- Basic Controls -->
                <div class="space-y-4">
                    <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Keyboard size={20} class="text-blue-500" />
                        Basic Controls
                    </h3>
                    <div class="space-y-3">
                        <div class="flex items-start gap-3">
                            <div class="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0 mt-0.5">
                                #
                            </div>
                            <p class="text-gray-700">Use <code class="bg-gray-100 px-2 py-1 rounded text-sm font-mono">#</code> to create a blank square</p>
                        </div>
                        <div class="flex items-start gap-3">
                            <div class="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0 mt-0.5">
                                ↵
                            </div>
                            <p class="text-gray-700">Hit <kbd class="bg-gray-100 px-2 py-1 rounded text-sm font-mono">Enter</kbd> or double-click the question on the right to set an answer</p>
                        </div>
                        <div class="flex items-start gap-3">
                            <div class="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0 mt-0.5">
                                ⌨
                            </div>
                            <p class="text-gray-700">Use <kbd class="bg-gray-100 px-2 py-1 rounded text-sm font-mono">Space</kbd> to change directions</p>
                        </div>
                        <div class="flex items-start gap-3">
                            <div class="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0 mt-0.5">
                                ↑↓←→
                            </div>
                            <p class="text-gray-700">Use arrow keys to navigate around the grid</p>
                        </div>
                    </div>
                </div>
                
                <!-- Pro Tips -->
                <div class="space-y-4">
                    <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Lightbulb size={20} class="text-yellow-500" />
                        Pro Tips
                    </h3>
                    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p class="text-gray-700">
                            <strong>Hint:</strong> Complete the words before starting on the answers, because you might have to change something!
                        </p>
                    </div>
                </div>
                
                <!-- Status Notice -->
                <div class="space-y-4">
                    <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <AlertCircle size={20} class="text-orange-500" />
                        Status
                    </h3>
                    <div class="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <p class="text-gray-700">
                            <strong>Note:</strong> This Crossword Creator is in Beta. 
                            <a 
                                href="https://github.com/j-norwood-young/jxword-creator/issues" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                class="text-blue-600 hover:text-blue-800 underline font-medium"
                            >
                                Please report bugs here
                            </a>.
                        </p>
                    </div>
                </div>
            </div>
            
            <!-- Modal footer -->
            <div class="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                    onclick={hideInstructions}
                    class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors flex items-center gap-2"
                >
                    Got it!
                </button>
            </div>
        </div>
    </div>
{/if}