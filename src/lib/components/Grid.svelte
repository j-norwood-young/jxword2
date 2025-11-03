<script lang="ts">
    const DEFAULT_SIZE = 10;

    // Stores
    import { questionsAcross, questionsDown, currentDirection, currentQuestion } from "$lib/libs/stores";
    import type { Question as QuestionType } from "$lib/types/Question";

    // Components
    import Questions from "./Questions.svelte";

    // Utils
    import { getWord, isStartOfAcross, isStartOfDown } from "$lib/libs/crossword_utils";

    type Props = {
        Container: HTMLDivElement;
        Input: HTMLInputElement;
        grid?: string[][];
        questions_across?: QuestionType[];
        questions_down?: QuestionType[];
        current_direction?: 'across' | 'down';
        current_question?: QuestionType;
        size?: number;
        current_x?: number;
        current_y?: number;
        totalWidth?: number;
        totalHeight?: number;
        outerBorderWidth?: number;
        innerBorderWidth?: number;
        margin?: number;
        outerBorderColour?: string;
        innerBorderColour?: string;
        fillColour?: string;
        backgroundColour?: string;
        fontRatio?: number;
        numRatio?: number;
        onchange?: () => void;
        onmove?: (direction: string) => void;
        onletter?: (letter: string) => void;
        onbackspace?: () => void;
        onenter?: () => void;
        ontab?: (direction: string) => void;
        onfocus?: () => void;
        onblur?: () => void;
    }

    let {
        Container = $bindable(),
        Input = $bindable(),
        grid = $bindable(Array(DEFAULT_SIZE).fill(Array(DEFAULT_SIZE).fill(" "))),
        questions_across = $bindable([]),
        questions_down = $bindable([]),
        size = DEFAULT_SIZE,
        current_direction = $bindable("across"),
        current_question = $bindable(),
        current_x = $bindable(0),
        current_y = $bindable(0),
        totalWidth = $bindable(500),
        totalHeight = $bindable(500),
        outerBorderWidth = $bindable(1.5),
        innerBorderWidth = $bindable(1),
        margin = $bindable(3),
        outerBorderColour = $bindable("black"),
        innerBorderColour = $bindable("black"),
        fillColour = $bindable("black"),
        backgroundColour = $bindable("white"),
        fontRatio = $bindable(0.7),
        numRatio = $bindable(0.33),
        onchange,
        onmove,
        onletter,
        onbackspace,
        onenter,
        ontab,
    }: Props = $props();

    // Private properties
    let number_grid: number[][] | null[][] = [];
    let marked_word_grid: boolean[][] = $state([]);
    const viewbox_width: number = totalWidth + margin + outerBorderWidth;
    const viewbox_height: number = totalHeight + margin + outerBorderWidth;
    const cellWidth: number = totalWidth / size;
    const cellHeight: number = totalHeight / size;
    const fontSize: number = cellWidth * fontRatio;
    const numFontSize: number = cellWidth * numRatio;
    
$effect(() => {
    console.log(questions_across, questions_down);
    const calculated_size = size < 2 ? 2 : size > 30 ? 30 : size;
    let num = 1;
    // Grow grid if necessary
    if (grid.length - 1 < calculated_size) {
        for (let i = 0; i < calculated_size; i++) {
            grid[i] = grid[i] || Array(calculated_size).map(() => " ");
            number_grid[i] = number_grid[i] || Array(calculated_size).map(() => " ");
        }
    }
    // Shrink grid if necessary
    while (grid.length > calculated_size) {
        for (let i = 0; i < grid.length; i++) {
            while(grid[i].length > calculated_size) {
                grid[i].pop();
                number_grid[i].pop();
            }
        }
        grid.pop();
        number_grid.pop();
    }
    // Make sure we're still in the grid
    if (current_x >= calculated_size) {
        current_x = calculated_size - 1;
    }
    if (current_y >= calculated_size) {
        current_y = calculated_size - 1;
    }
    for (let y = 0; y < calculated_size; y++) {
        if (!number_grid[y]) {
            number_grid[y] = Array(calculated_size);
        }
        for (let x = 0; x < calculated_size; x++) {
            grid[y][x] = grid[y][x] || " ";
            if (grid[y][x] === "#") continue;
            let found = false;
            if (isStartOfAcross(grid, x, y)) {
                questions_across.push(getQuestion(num, x, y, "across", ""));
                found = true;
            } 
            if (isStartOfDown(grid, x, y)) {
                questions_down.push(getQuestion(num, x, y, "down", ""));
                found = true;
            } 
            if (!found) {
                number_grid[y][x] = null;
            } else {
                number_grid[y][x] = num++;
            }
        }
    }
    // drawMarkedWordGrid();
})

export function selectCell(e: MouseEvent) {
    current_x = parseInt((e.target as HTMLElement)?.getAttribute("data-col") || "0");
    current_y = parseInt((e.target as HTMLElement)?.getAttribute("data-row") || "0");
    drawMarkedWordGrid();
    onchange?.();
}

function getQuestion(num: number, x: number, y: number, direction: 'across' | 'down', question: string) {
    const answer = getWord(grid, x, y, direction);
    if (direction === "across") {
        for (let i = 0; i < questions_across.length; i++) {
            if (questions_across[i].answer === answer && questions_across[i].direction === direction) {
                return { ...questions_across[i], answer, num, x, y };
            }
            if (questions_across[i].num === num && questions_across[i].direction === direction) {
                return { ...questions_across[i], answer, x, y };
            }
        }
        return { num, x, y, question, answer, editing: false, direction };
    } else {
        for (let i = 0; i < questions_down.length; i++) {
            if (questions_down[i].answer === answer && questions_down[i].direction === direction) {
                return { ...questions_down[i], answer, num, x, y };
            }
            if (questions_down[i].num === num && questions_down[i].direction === direction) {
                return questions_down[i] = { ...questions_down[i], answer, x, y };
            }
        }
        return { num, x, y, question, answer, editing: false, direction: direction as 'across' | 'down' };
    }
}

function getCurrentQuestion() {
    let {x, y} = getCurrentPos();
    let selected_question;
    let questions = current_direction === "across" ? questions_across : questions_down;
    if (!questions.length) return;
    if (current_direction === "across") {
        selected_question = questions.find(q => y === q.y && x >= q.x && x <= q.x + q.answer.length - 1);
    } else {
        selected_question = questions.find(q => x === q.x && y >= q.y && y <= q.y + q.answer.length - 1);
    }
    return selected_question;
}

function drawMarkedWordGrid() {
    console.log("drawMarkedWordGrid");
    marked_word_grid = Array(size).fill(false).map(() => Array(size).fill(false));
    return;
    console.log({ marked_word_grid })
    if (current_direction === "across") {
        for (let x = current_x; x < size; x++) {
            if (!grid[current_y]) break;
            if (grid[current_y][x] === "#") {
                break;
            }
            marked_word_grid[current_y][x] = true;
        }
        for (let x = current_x; x >= 0; x--) {
            if (!grid[current_y]) break;
            if (grid[current_y][x] === "#") {
                break;
            }
            marked_word_grid[current_y][x] = true;
        }
    } else { // down
        for (let y = current_y; y < size; y++) {
            if (!grid[y]) break;
            if (grid[y][current_x] === "#") {
                break;
            }
            marked_word_grid[y][current_x] = true;
        }
        for (let y = current_y; y >= 0; y--) {
            if (!grid[y]) break;
            if (grid[y][current_x] === "#") {
                break;
            }
            marked_word_grid[y][current_x] = true;
        }
    }
}

export function moveUp() {
    if (current_y > 0) {
        current_y--;
        onchange?.();
        drawMarkedWordGrid();
    }
}

export function moveDown() {
    if (current_y < size - 1) {
        current_y++;
        onchange?.();
        drawMarkedWordGrid();
    }
}

export function moveLeft() {
    if (current_x > 0) {
        current_x--;
        onchange?.();
        drawMarkedWordGrid();
    } else {
        if (current_y > 0) {
            current_y--;
            current_x = size - 1;
            onchange?.();
            drawMarkedWordGrid();
        }
    }
}

export function moveRight() {
    if (current_x < size - 1) {
        current_x++;
        onchange?.();
        drawMarkedWordGrid();
    } else {
        if (current_y < size - 1) {
            current_y++;
            current_x = 0;
            onchange?.();
            drawMarkedWordGrid();
        }
    }
}

export function moveNextWord() {
    let questions = current_direction === "across" ? questions_across : questions_down;
    const current_question = getCurrentQuestion();
    if (!current_question) return;
    const current_question_index = questions.findIndex(q => q.num === current_question.num);
    if (current_question_index === questions.length - 1) {
        current_x = 0;
        current_y = 0;
        if (current_direction === "across") {
            current_direction = "down";
        } else {
            current_direction = "across";
        }
        onchange?.();
        drawMarkedWordGrid();
        return;
    }
    let next_question = questions[current_question_index + 1];
    current_x = next_question.x;
    current_y = next_question.y;
    onchange?.();
    drawMarkedWordGrid();
    return;
}

export function movePrevWord() {
    let questions = current_direction === "across" ? questions_across : questions_down;
    const current_question = getCurrentQuestion();
    if (!current_question) return;
    const current_question_index = questions.findIndex(q => q.num === current_question.num);
    if (current_question_index === 0) {
        current_x = 0;
        current_y = 0;
        if (current_direction === "across") {
            current_x = size - 1;
            current_direction = "down";
        } else {
            current_y = size - 1;
            current_direction = "across";
        }
        onchange?.();
        drawMarkedWordGrid();
        return;
    }
    let prev_question = questions[current_question_index - 1];
    current_x = prev_question.x;
    current_y = prev_question.y;
    onchange?.();
    drawMarkedWordGrid();
    return;
}

export function moveStartOfRow() {
    current_x = 0;
    onchange?.();
    drawMarkedWordGrid();
}

export function moveEndOfRow() {
    current_x = size - 1;
    onchange?.();
    drawMarkedWordGrid();
}

export function moveStartOfCol() {
    current_y = 0;
    onchange?.();
    drawMarkedWordGrid();
}

export function moveEndOfCol() {
    current_y = size - 1;
    onchange?.();
    drawMarkedWordGrid();
}

export function handleArrowkey(dir: 'up' | 'down' | 'left' | 'right') {
    if (dir === "up") {
        moveUp();
    }
    if (dir === "down") {
        moveDown();
    }
    if (dir === "left") {
        moveLeft();
    }
    if (dir === "right") {
        moveRight();
    }
}

export function toggleDir() {
    if (current_direction === "across") {
        current_direction = "down";
    } else {
        current_direction = "across";
    }
     // Find the current question
    //  const current_question = getCurrentQuestion();
    // console.log(current_question);
    onchange?.();
    drawMarkedWordGrid();
}

export function setDir(direction: 'across' | 'down') {
    if (direction === "across") {
        current_direction = "across";
    } else {
        current_direction = "down";
    }
    onchange?.();
    drawMarkedWordGrid();
}

export function getCurrentPos() {
    return {
        x: current_x,
        y: current_y
    };
}

export function setCurrentPos(x: number, y: number) {
    current_x = x;
    current_y = y;
    onchange?.();
    drawMarkedWordGrid();
}

function handleDoubleclick(x: number, y: number) {
    toggleDir();
}

export function handleKeydown (e: KeyboardEvent) {
    e.preventDefault();
    const keycode = e.keyCode;
    if (e.metaKey) return;
    if ((keycode > 64 && keycode < 91)) {
        onletter?.(e.key.toUpperCase());
    } else if (keycode === 51 || keycode === 190) { // # or .
        onletter?.(e.key.toUpperCase());
    } else if (keycode === 8) { // Backspace
        onbackspace?.();
    } else if (keycode == 32) { // Space
        onletter?.(e.key.toUpperCase());
    } else if ((keycode === 9)) { // Tab
        if (e.shiftKey) {
            ontab?.(e.key.toUpperCase()); // Previous word
        } else {
            ontab?.(e.key.toUpperCase()); // Next word
        }
    } else if (keycode === 13) { // Enter
        onenter?.();
    } else if (keycode === 37) {
        onmove?.("left");
    } else if (keycode === 38) {
        onmove?.("up");
    } else if (keycode === 39) {
        onmove?.("right");
    } else if (keycode === 40) {
        onmove?.("down");
    }
    handleFocus(e);
}

export function handleFocus(e?: Event) {
    if (!Input) return;
    const x = window.scrollX;
    const y = window.scrollY;
    Input.focus({
        preventScroll: true,
    });
    // Scroll to the previous location
    window.scrollTo(x, y);
}

function handleUpdateQuestion(question: QuestionType) {
    // console.log(question);
    if (question.direction === "across") {
        for (let i = 0; i < question.answer.length; i++) {
            grid[question.y][i + question.x] = question.answer[i];
        }
    } else {
        for (let i = 0; i < question.answer.length; i++) {
            grid[i + question.y][question.x] = question.answer[i];
        }
    }
    // Set focus back on the svg
    handleFocus(undefined);
}
</script>

{#if grid.length > 0 && marked_word_grid.length > 0}
<div role="main" class="flex flex-row">
    <div class="jxword-svg-container" bind:this={Container}>
        <input bind:this={Input} type="text" onkeydown={handleKeydown} />
        <svg class='jxword-svg' viewBox="0 0 {viewbox_width} {viewbox_height}" width={viewbox_width} height={viewbox_height}>
            <g class="cell-group">
                {#each grid as col_data, y}
                    {#each col_data as letter, x}
                        <g id="jxword-cell-{x}-{y}" class="jxword-cell" style="z-index: 20" class:selected="{(current_y === y && current_x === x)}" class:active="{(marked_word_grid?.[y]?.[x])}" role="button" tabindex="0" onclick={() => { setCurrentPos(x, y);}} ondblclick={() => {handleDoubleclick(x, y)}} onkeydown={handleKeydown}>
                            {#if letter=="#"}
                                <rect class="jxword-cell-rect" role="cell" tabindex="-1" aria-label="blank cell" y="{(cellWidth * y) + margin}" x="{(cellHeight * x) + margin}" width="{cellWidth}" height="{cellHeight}" stroke="{innerBorderColour}" stroke-width="{innerBorderWidth}" fill="{fillColour}" data-col="{y}" data-row="{ x }" onfocus="{handleFocus}"></rect>
                                <!-- Draw cross -->
                                <line class="jxword-cell-line jxword-no-print" role="cell" tabindex="-1" y1="{(cellHeight * y) + margin + innerBorderWidth}" x1="{(cellWidth * x) + margin + innerBorderWidth}" y2="{(cellHeight * y) + (innerBorderWidth * y) + cellHeight}" x2="{(cellWidth * x) + (innerBorderWidth * y) + cellWidth}" stroke="{innerBorderColour}" stroke-width="{innerBorderWidth}" data-col="{y}" data-row="{ x }" onfocus="{handleFocus}"></line>
                                <line class="jxword-no-print jxword-cell-line" role="cell" tabindex="-1" y1="{(cellHeight * y) + margin + innerBorderWidth}" x1="{(cellWidth * x) + margin + innerBorderWidth}" y2="{(cellHeight * y) + (innerBorderWidth * y) + cellHeight}" x2="{(cellWidth * x) + (innerBorderWidth * y) + cellWidth}" stroke="{innerBorderColour}" stroke-width="{innerBorderWidth}" data-col="{y}" data-row="{ x }" onfocus="{handleFocus}" transform="rotate(90, {(cellWidth * x) + margin + (cellWidth / 2)}, {(cellHeight * y) + margin + (cellWidth / 2)})"></line>
                            {:else}
                                <rect class="jxword-cell-rect" role="cell" tabindex="-1" aria-label="cell {x},{y}" y="{(cellWidth * y) + margin}" x="{(cellHeight * x) + margin}" width="{cellWidth}" height="{cellHeight}" stroke="{innerBorderColour}" stroke-width="{innerBorderWidth}" fill="{backgroundColour}" data-col="{ x }" data-row="{ y }" onfocus="{handleFocus}"></rect>
                                <text class="jxword-no-print-blank" id="jxword-letter-{x}-{y}" x="{ ((cellWidth * x) + margin) + (cellWidth / 2) }" y="{ ((cellHeight * y) + margin) + cellHeight - (cellHeight * 0.1) }" text-anchor="middle" font-size="{ fontSize }" width="{ cellWidth }" onfocus="{handleFocus}">{ letter }</text>
                            {/if}
                            {#if (number_grid?.[y]?.[x] != null && letter!=="#")}
                                <text x="{(cellWidth * x) + margin + 2}" y="{(cellHeight * y) + margin + numFontSize}" text-anchor="left" font-size="{ numFontSize }" onfocus="{handleFocus}">{ (number_grid[y][x]) }</text>
                            {/if}
                        </g>
                    {/each}
                {/each}
                <rect x="{margin}" y="{margin}" width="{totalWidth}" height="{totalHeight}" stroke="{outerBorderColour }" stroke-width="{outerBorderWidth }" fill="none" onfocus="{handleFocus}"></rect>
            </g>
        </svg>
    </div>
    <Questions questions_across={questions_across} questions_down={questions_down} current_question={current_question as QuestionType} current_direction={current_direction as 'across' | 'down'} onupdate={handleUpdateQuestion} />
</div>
{/if}


<style lang="scss" scoped>
    div[role="main"] {
        display: flex;
        flex-direction: row;
        align-items: top;
        justify-content: center;
        height: 100%;
        width: 100%;
        touch-action: none;
        user-select: none;
        .jxword-svg-container {
            width: 50%;
        }
    }

    input {
        opacity: 0;
        position: absolute;
        left: -1000px;
    }

    svg.jxword-svg {
        max-width: 100%; 
        max-height: 100%;
        *:focus {
            outline: none;
        }
        .jxword-cell-rect {
            user-select: none;
        }
        .active {
            rect.jxword-cell-rect {
                fill: #9ce0fb;
            }
        }
        .selected {
            rect.jxword-cell-rect {
                fill: #f7f457;
            }
        }
        
    }
</style>