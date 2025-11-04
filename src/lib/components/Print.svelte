<script lang="ts">
    import Button from "./Button.svelte";
    import { Printer, FileText } from "lucide-svelte";
    import type { CrosswordData } from "$lib/types/Crossword";
    
    type Props = {
        state?: CrosswordData;
    }
    
    let { state }: Props = $props();

    function printBlank() {
        const svgElement = document.querySelector(`.crossword-svg`) as Element;
        if (!svgElement) return;
        const svg = svgElement.cloneNode(true) as Element;
        if (!svg) return;
        const remove_els = [...svg.querySelectorAll(`.jxword-no-print-blank`), ...svg.querySelectorAll(`.jxword-no-print`)];
        for (let remove_el of remove_els) {
            remove_el.remove();
        }
        print(svg);
    }

    function printFilled() {
        const svgElement = document.querySelector(`.crossword-svg`) as Element;
        if (!svgElement) return;
        const svg = svgElement.cloneNode(true) as Element;
        if (!svg) return;
        const remove_els = [...svg.querySelectorAll(`.jxword-no-print`)];
        for (let remove_el of remove_els) {
            remove_el.remove();
        }
        print(svg);
    }

    function formatQuestions(direction: "across" | "down") {
        if (!state) return "";
        const questions = direction === "down" ? state.clues.down : state.clues.across;
        return questions.map(question => `<li>${question.alpha_number || question.number}: ${question.clue || ""}</li>`).join("");
    }

    function print(svg: Element) {
        const svg_text = svg.outerHTML.replace(/fill="#f7f457"/g, `fill="#ffffff"`).replace(/fill="#9ce0fb"/g, `fill="#ffffff"`);
        const questions_across = `<h4>Across</h4><ol class="jxword-questions-list">${formatQuestions("across")}</ol>`;
        const questions_down = `<h4>Down</h4><ol class="jxword-questions-list">${formatQuestions("down")}</ol>`;
        let printWindow = window.open();
        if (!printWindow) return;
        printWindow.document.write(`<html><head><title>${state?.title || "Crossword"}</title>`);
        printWindow.document.write(`<style>
            .svg-container {
                height: 35em;
                display:block;
            }
            .jxword-svg {
                height: 100%;
                width: 100%;
            }
            .jxword-questions-list {
                list-style: none;
                line-height: 1.5;
                font-size: 12px;
                padding-left: 0px;
                display: flex;
                flex-direction: column;
                margin-right: 20px;
            }
            .jxword-questions-list-item-num {
                margin-right: 5px;
                text-align: right;
                width: 25px;
                min-width: 25px;
                font-weight: bold;
            }
            .questions {
                display: flex;
                flex-direction: row;
                flex-wrap: wrap;
            }
        </style>`);
        printWindow.document.write(`<div class="svg-container">${svg_text}</div>`);
        printWindow.document.write(`<div class="questions">\n`);
        printWindow.document.write(`<div>${questions_across}</div>`);
        printWindow.document.write(`<div>${questions_down}</div>`);
        printWindow.document.write(`</div>`);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    }
</script>

<main class="flex flex-col gap-2">
    <Button variant="secondary" onclick={printFilled}>
        <Printer size={16} class="mr-2" />
        Print (Filled)
    </Button>
    <Button variant="secondary" onclick={printBlank}>
        <FileText size={16} class="mr-2" />
        Print (Blank)
    </Button>
</main>