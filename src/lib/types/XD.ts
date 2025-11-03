import type { Question } from './Question.js';

export interface XD {
    title?: string;
    author?: string;
    editor?: string;
    date?: string;
    difficulty?: string;
    type?: string;
    copyright?: string;
    grid: string[][];
    questions_across: Question[];
    questions_down: Question[];
    size?: number;
    current_x?: number;
    current_y?: number;
    direction?: 'across' | 'down';
}
