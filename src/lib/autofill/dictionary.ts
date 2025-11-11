import dictionary from './dictionary.json';

/**
 * Dictionary structure: words organized by length
 */
export type Dictionary = Record<number, string[]>;

/**
 * Get matching words for a pattern
 * Pattern uses '?' for unknown letters, e.g., "A?D" matches "AND", "AID", etc.
 */
function matchesPattern(word: string, pattern: string): boolean {
	if (word.length !== pattern.length) return false;
	for (let i = 0; i < pattern.length; i++) {
		if (pattern[i] !== '?' && pattern[i].toUpperCase() !== word[i].toUpperCase()) {
			return false;
		}
	}
	return true;
}

/**
 * Get words matching a pattern from the dictionary
 */
export function getMatchingWords(pattern: string): string[] {
	const length = pattern.length;
	const words = (dictionary as Record<number, string[]>)[length];
	if (!words) return [];
	return words.filter((word: string) => matchesPattern(word, pattern));
}

/**
 * Get all words of a specific length
 */
export function getWordsByLength(length: number): string[] {
	return (dictionary as Record<number, string[]>)[length] || [];
}

/**
 * Check if a word is in the dictionary
 */
export function isWordValid(word: string): boolean {
	const upperWord = word.trim().toUpperCase();
	if (upperWord.length === 0) return false;
	
	const words = (dictionary as Record<number, string[]>)[upperWord.length];
	if (!words) return false;
	
	return words.includes(upperWord);
}

/**
 * Get dictionary statistics
 */
export function getDictionaryStats() {
	const dict = dictionary as Record<number, string[]>;
	const lengths = Object.keys(dict).map(Number);
	const totalWords = Object.values(dict).reduce((sum: number, arr: unknown) => {
		return sum + (Array.isArray(arr) ? arr.length : 0);
	}, 0);
	return {
		totalWords,
		lengths: lengths.length,
		minLength: Math.min(...lengths),
		maxLength: Math.max(...lengths)
	};
}
