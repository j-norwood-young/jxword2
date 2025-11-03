<script lang="ts">
    import { suggest } from "../suggestions/suggest";
    import QuestionEditModal from './QuestionEditModal.svelte';
    import { Edit2 } from 'lucide-svelte';
    import type { Question } from "$lib/types/Question";

    type Props = {
        onupdate: (updatedQuestion: Question) => void;
        question: Question;
        is_current_question: boolean;
    }
    
    const { onupdate, question, is_current_question }: Props = $props();

    // Private props
    let suggestions: string[] = $state([]);
    let isModalOpen = $state(false);

    function editQuestion() {
        isModalOpen = true;
    }

    function handleModalSave(updatedQuestion: Question) {
        onupdate(updatedQuestion);
    }

    function handleModalClose() {
        isModalOpen = false;
    }

    function useSuggestion(suggestion: string) {
        suggestion = suggestion.toUpperCase();
        question.answer = suggestion;
        onupdate(question);
    }


    $effect(() => {
        let suggestion_query = question.answer.replace(/\ /g, "?");
        if (!suggestion_query.includes("?")) {
            suggestions = [];
        } else {
            suggestions = suggest(suggestion_query);
        }
    });
</script>

<main class="mb-3 border border-gray-200 rounded-lg bg-white transition-all duration-200 hover:border-gray-300 hover:shadow-sm {is_current_question ? 'border-green-500 bg-green-50' : ''}">
    <div class="p-4">
        <!-- Header -->
        <div class="flex items-center justify-between mb-3">
            <div class="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                {question.num}
            </div>
            <button 
                onclick={() => editQuestion()} 
                class="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                title="Edit question"
            >
                <Edit2 size={14} />
                Edit
            </button>
        </div>
        
        <!-- Content -->
        <div class="space-y-3">
            <!-- Clue -->
            <div>
                <div class="text-sm font-medium text-gray-900 leading-relaxed">
                    {question.question || "No question set"}
                </div>
            </div>
            
            <!-- Answer -->
            <div class="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-md">
                <span class="text-xs font-semibold text-gray-600 uppercase tracking-wide">Answer:</span>
                <span class="font-mono text-base font-bold text-gray-800">{question.answer}</span>
            </div>
            
            <!-- Suggestions -->
            {#if suggestions.length}
                <div>
                    <div class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Suggestions:</div>
                    <div class="flex flex-wrap gap-2">
                        {#each suggestions as suggestion}
                            <button 
                                onclick={() => useSuggestion(suggestion)} 
                                class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium hover:bg-blue-200 transition-colors"
                            >
                                {suggestion}
                            </button>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
    </div>
    
    <!-- Modal -->
    <QuestionEditModal 
        isOpen={isModalOpen}
        {question}
        onsave={handleModalSave}
        onclose={handleModalClose}
    />
</main>
