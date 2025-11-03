<script lang="ts">
    import { Check, X, Lightbulb } from 'lucide-svelte';
    import { suggest } from "../suggestions/suggest";
    import { fade, scale } from 'svelte/transition';
    import type { Question } from "$lib/types/Question";

    type Props = {
        onsave: (updatedQuestion: Question) => void;
        onclose: () => void;
        question: Question;
        isOpen: boolean;
    }

    let { onsave, onclose, question, isOpen }: Props = $props();
    
    let editedQuestion: string = $state('');
    let suggestions: string[] = $state([]);
    
    // Update the edited question when the modal opens
    $effect(() => {
        if (isOpen && question) {
        editedQuestion = question.question || '';
        updateSuggestions();
        // Focus the textarea after the modal opens
        setTimeout(() => {
            const textarea = document.getElementById('question-input') as HTMLTextAreaElement;
            if (textarea) {
                textarea.focus();
                textarea.select();
            }
        }, 100);
    }
    });
    
    function updateSuggestions() {
        if (question?.answer) {
            let suggestion_query = question.answer.replace(/\ /g, "?");
            if (!suggestion_query.includes("?")) {
                suggestions = [];
            } else {
                suggestions = suggest(suggestion_query);
            }
        }
    }
    
    function handleSave() {
        if (question) {
            question.question = editedQuestion;
            onsave(question);
        }
        handleClose();
    }
    
    function handleClose() {
        onclose();
    }
    
    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            handleClose();
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            handleSave();
        }
    }
    
    function handleBackdropClick(e: MouseEvent) {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    }
    
    function useSuggestion(suggestion: string) {
        editedQuestion = suggestion;
    }
</script>

{#if isOpen}
    <!-- Modal backdrop -->
    <div 
        class="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50"
        onclick={handleBackdropClick}
        onkeydown={handleKeydown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabindex="-1"
        transition:fade={{ duration: 200 }}
    >
        <!-- Modal content -->
        <div 
            class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            transition:scale={{ duration: 300, start: 0.95 }}
        >
            <!-- Modal header -->
            <div class="flex items-center justify-between p-6 border-b border-gray-200">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {question?.num}
                    </div>
                    <div>
                        <h2 id="modal-title" class="text-xl font-semibold text-gray-900">
                            Edit Question
                        </h2>
                        <p class="text-sm text-gray-600 capitalize">
                            {question.num} {question.direction === "across" ? "Across" : "Down"}
                        </p>
                    </div>
                </div>
                <button
                    onclick={handleClose}
                    class="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Close modal"
                >
                    <X size={24} />
                </button>
            </div>
            
            <!-- Modal body -->
            <div class="p-6 space-y-6">
                <!-- Question input -->
                <div>
                    <label for="question-input" class="block text-sm font-medium text-gray-700 mb-2">
                        Clue
                    </label>
                    <textarea
                        id="question-input"
                        bind:value={editedQuestion}
                        class="w-full h-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        placeholder="Enter your clue here..."
                    ></textarea>
                </div>
                
                <!-- Answer display -->
                <div>
                    <div class="text-sm font-medium text-gray-700 mb-2">
                        Answer
                    </div>
                    <div class="px-3 py-2 bg-gray-100 border border-gray-200 rounded-md font-mono text-lg font-bold text-gray-800">
                        {question?.answer || 'No answer set'}
                    </div>
                </div>
                
                <!-- Word suggestions -->
                {#if suggestions.length > 0}
                    <div>
                        <div class="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Lightbulb size={16} />
                            Word Suggestions
                        </div>
                        <div class="flex flex-wrap gap-2">
                            {#each suggestions as suggestion}
                                <button
                                    onclick={() => useSuggestion(suggestion)}
                                    class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors"
                                >
                                    {suggestion}
                                </button>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
            
            <!-- Modal footer -->
            <div class="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                <button
                    onclick={handleClose}
                    class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onclick={handleSave}
                    class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors flex items-center gap-2"
                >
                    <Check size={16} />
                    Save Changes
                </button>
            </div>
        </div>
    </div>
{/if}
