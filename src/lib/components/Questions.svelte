<script lang="ts">
    import Question from "./Question.svelte";
    import type { Question as QuestionType } from "$lib/types/Question";

    type Props = {
        questions_across: QuestionType[];
        questions_down: QuestionType[];
        onupdate: (updatedQuestion: QuestionType) => void;
        current_question: QuestionType;
        current_direction: 'across' | 'down';
    }

    const { questions_across = $bindable([]), questions_down = $bindable([]), onupdate, current_question, current_direction }: Props = $props();
    
    
</script>

<main class="w-1/2 px-4">
    <div class="flex flex-col lg:flex-row gap-6">
        <!-- Across Questions -->
        <div class="flex-1 min-w-0">
            <h4 class="mb-4 px-4 py-3 bg-gray-50 rounded-lg text-lg font-semibold text-gray-700 text-center border border-gray-200">
                Across
            </h4>
            <div class="space-y-3">
                {#each questions_across as question}
                    <Question question={question} is_current_question={(question && current_question) && question.num === current_question.num && current_direction === 'across'} onupdate={onupdate} />
                {/each}
            </div>
        </div>
        
        <!-- Down Questions -->
        <div class="flex-1 min-w-0">
            <h4 class="mb-4 px-4 py-3 bg-gray-50 rounded-lg text-lg font-semibold text-gray-700 text-center border border-gray-200">
                Down
            </h4>
            <div class="space-y-3">
                {#each questions_down as question}
                    <Question question={question} is_current_question={(question && current_question) && question.num === current_question.num && current_direction === 'down'} onupdate={onupdate} />
                {/each}
            </div>
        </div>
    </div>
</main>
