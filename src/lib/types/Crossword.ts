export type CrosswordData = {
    title: string;
    author: string;
    date: string;
    difficulty: string;
    type: string;
    copyright: string;
    editor?: string;
    grid: string[][];
    clues: {
        across: Array<CrosswordQuestion>;
        down: Array<CrosswordQuestion>;
    };
};

export type CrosswordQuestion = {
    number: number;
    clue: string;
    answer: string;
    correct?: boolean;
}

export type CrosswordBlock = {
    x: number;
    y: number;
    direction: number; // 0 = across, 1 = down
    letter: string;
    current_letter?: string;
    startOfWord: boolean;
    index: number;
    question_number: string;
    question_clue: string;
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