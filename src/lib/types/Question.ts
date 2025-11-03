export interface Question {
    num: number;
    x: number;
    y: number;
    question: string;
    answer: string;
    editing: boolean;
    direction: 'across' | 'down';
}