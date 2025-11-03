import { writable } from 'svelte/store';
import type { Question } from '$lib/types/Question';

export const isEditingQuestion = writable(false);
export const questionsAcross = writable<Question[]>([]);
export const questionsDown = writable<Question[]>([]);
export const currentDirection = writable<'across' | 'down'>("across");
export const currentQuestion = writable<Question | undefined>(undefined);