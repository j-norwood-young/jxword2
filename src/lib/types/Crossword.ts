export type CrosswordData = {
    title?: string;
    author?: string;
    date?: string;
    difficulty?: string;
    type?: string;
    copyright?: string;
    editor?: string;
    grid: string[][];
    clues: {
        across: Array<CrosswordQuestion>;
        down: Array<CrosswordQuestion>;
    };
};

export type CrosswordQuestion = {
    direction: number; // 0 = across, 1 = down
    number?: number;
    clue?: string;
    answer?: string;
    alpha_number?: string;
}

export type CrosswordBlock = {
    x: number;
    y: number;
    direction: number; // 0 = across, 1 = down
    letter: string;
    current_letter?: string;
    startOfWord: boolean;
    letter_index: number;
    question_index: number;
    question: CrosswordQuestion;
    correct: boolean;
}

export type GameState = {
    time_taken: number;
    autocheck: boolean;
    cheated: boolean;
    complete: boolean;
    hints: boolean;
    direction: number; // 0 = across, 1 = down
    currentCell: [number, number];
    grid: string[][];
    correctGrid: boolean[][];
    incorrectGrid: boolean[][];
    // scalarAcross: CrosswordBlock[];
    // scalarDown: CrosswordBlock[];
    progress: number;
    quartile: number;
}