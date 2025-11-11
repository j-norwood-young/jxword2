import type { CrosswordData, CrosswordBlock } from '$lib/types/Crossword';

/**
 * Word pattern matching - calls API endpoint to get matching words
 */
async function getMatchingWords(pattern: string): Promise<string[]> {
	try {
		// Validate pattern before sending
		if (!pattern || pattern.trim() === '') {
			console.error('Cannot fetch matching words: pattern is empty');
			return [];
		}
		
		// Ensure pattern only contains letters and ?
		if (!/^[A-Za-z?]+$/.test(pattern)) {
			console.error('Invalid pattern format:', JSON.stringify(pattern));
			return [];
		}
		
		const url = `/api/autofill/match?pattern=${encodeURIComponent(pattern)}`;
		console.log('Fetching from:', url, 'pattern length:', pattern.length);
		const response = await fetch(url);
		if (!response.ok) {
			const errorText = await response.text();
			console.warn('Failed to fetch matching words:', response.status, response.statusText, errorText);
			return [];
		}
		const data = await response.json();
		const matchCount = data.matches?.length || 0;
		const displayMatches = data.matches?.slice(0, 10) || []; // Show first 10 matches
		console.log(`API response: pattern="${data.pattern}", count=${matchCount}, matches:`, displayMatches);
		if (matchCount > 10) {
			console.log(`  ... and ${matchCount - 10} more matches`);
		}
		return data.matches || [];
	} catch (error) {
		console.error('Error fetching matching words:', error);
		return [];
	}
}

/**
 * Get the current pattern of a word in the grid
 */
export function getWordPattern(
	grid: string[][],
	blocks: CrosswordBlock[],
	startBlock: CrosswordBlock
): string {
	const wordBlocks = blocks.filter(
		(b) => b.question.alpha_number === startBlock.question.alpha_number
	);
	
		if (wordBlocks.length === 0) {
			console.warn(`No blocks found for word ${startBlock.question.alpha_number}`);
			// Try to infer length from answer if available, otherwise return empty
			if (startBlock.question.answer && startBlock.question.answer.length > 0) {
				return '?'.repeat(startBlock.question.answer.length);
			}
			return '';
		}
	
	const pattern = wordBlocks
		.map((b) => {
			const current = grid[b.y]?.[b.x];
			// Treat empty strings, spaces, and '#' as unknown
			const trimmed = (current?.trim() || '').toUpperCase();
			// If empty, null, undefined, or '#', return '?'
			if (!trimmed || trimmed === '' || trimmed === '#') {
				return '?';
			}
			// Only return the letter if it's actually a letter
			if (/^[A-Z]$/.test(trimmed)) {
				return trimmed;
			}
			return '?';
		})
		.join('');
	
	// Ensure pattern is not empty
	if (!pattern || pattern.length === 0) {
		console.warn(`Empty pattern generated for word ${startBlock.question.alpha_number}`);
		return '?'.repeat(wordBlocks.length);
	}
	
	return pattern;
}

/**
 * Check if a word can be placed at a position
 */
function canPlaceWord(
	grid: string[][],
	blocks: CrosswordBlock[],
	word: string,
	startBlock: CrosswordBlock
): boolean {
	const wordBlocks = blocks.filter(
		(b) => b.question.alpha_number === startBlock.question.alpha_number
	);
	
	if (word.length !== wordBlocks.length) return false;
	
	// Check intersections with other words
	for (let i = 0; i < wordBlocks.length; i++) {
		const block = wordBlocks[i];
		const letter = word[i].toUpperCase();
		const current = grid[block.y]?.[block.x];
		const trimmed = current?.trim() || '';
		
		// If cell has a letter (not empty, not space, not #), it must match
		if (trimmed && trimmed !== '#' && trimmed.toUpperCase() !== letter) {
			return false;
		}
	}
	
	return true;
}

/**
 * Place a word in the grid
 */
function placeWord(
	grid: string[][],
	blocks: CrosswordBlock[],
	word: string,
	startBlock: CrosswordBlock
): void {
	const wordBlocks = blocks.filter(
		(b) => b.question.alpha_number === startBlock.question.alpha_number
	);
	
	for (let i = 0; i < wordBlocks.length; i++) {
		const block = wordBlocks[i];
		if (!grid[block.y]) grid[block.y] = [];
		grid[block.y][block.x] = word[i].toUpperCase();
	}
}

/**
 * Check if a word conflicts with existing words
 */
function hasConflict(
	grid: string[][],
	allBlocks: CrosswordBlock[],
	word: string,
	startBlock: CrosswordBlock,
	currentDirection: number
): boolean {
	const wordBlocks = allBlocks.filter(
		(b) => b.question.alpha_number === startBlock.question.alpha_number
	);
	
	// Check intersections with perpendicular words
	for (let i = 0; i < wordBlocks.length; i++) {
		const block = wordBlocks[i];
		const letter = word[i].toUpperCase();
		
		// Find intersecting words in the perpendicular direction
		const perpendicularBlocks = allBlocks.filter(
			(b) => b.direction !== currentDirection && b.x === block.x && b.y === block.y
		);
		
		if (perpendicularBlocks.length > 0) {
			const intersectingBlock = perpendicularBlocks[0];
			const intersectingWordBlocks = allBlocks.filter(
				(b) => b.question.alpha_number === intersectingBlock.question.alpha_number
			);
			
			// Find the position in the intersecting word
			const intersectIndex = intersectingWordBlocks.findIndex(
				(b) => b.x === block.x && b.y === block.y
			);
			
			if (intersectIndex >= 0) {
				const intersectingWordPattern = getWordPattern(grid, allBlocks, intersectingBlock);
				const requiredLetter = intersectingWordPattern[intersectIndex];
				
				// Check if we can find a word for the intersecting slot
				if (requiredLetter === '?') {
					// The intersecting word needs this letter
					// For now, we'll allow this and let the autofill algorithm handle it
					// This is a simplified conflict check
					continue;
				} else if (requiredLetter !== letter) {
					return true; // Conflict: letter doesn't match
				}
			}
		}
	}
	
	return false;
}

/**
 * Find all empty or partially filled words in the crossword
 */
export function findEmptyWords(
	grid: string[][],
	acrossBlocks: CrosswordBlock[],
	downBlocks: CrosswordBlock[]
): CrosswordBlock[] {
	const emptyWords: CrosswordBlock[] = [];
	
	// Check across words
	for (const block of acrossBlocks) {
		if (block.startOfWord) {
			const pattern = getWordPattern(grid, acrossBlocks, block);
			if (pattern.includes('?')) {
				emptyWords.push(block);
			}
		}
	}
	
	// Check down words
	for (const block of downBlocks) {
		if (block.startOfWord) {
			const pattern = getWordPattern(grid, downBlocks, block);
			if (pattern.includes('?')) {
				emptyWords.push(block);
			}
		}
	}
	
	return emptyWords;
}

/**
 * Autofill algorithm using backtracking
 */
export async function autofillCrossword(
	crosswordData: CrosswordData,
	acrossBlocks: CrosswordBlock[],
	downBlocks: CrosswordBlock[],
	maxIterations: number = 10000
): Promise<{
	success: boolean;
	grid: string[][];
	iterations: number;
}> {
	// Create a copy of the grid
	const grid = crosswordData.grid.map((row) => [...row]);
	const allBlocks = [...acrossBlocks, ...downBlocks];
	
	let iterations = 0;
	
	// Find all empty words
	const emptyWords = findEmptyWords(grid, acrossBlocks, downBlocks);
	
	// Try to fill words using backtracking
	async function backtrack(wordIndex: number): Promise<boolean> {
		iterations++;
		if (iterations > maxIterations) return false;
		
		if (wordIndex >= emptyWords.length) {
			return true; // All words filled
		}
		
		const currentWord = emptyWords[wordIndex];
		const blocks = currentWord.direction === 0 ? acrossBlocks : downBlocks;
		const pattern = getWordPattern(grid, blocks, currentWord);
		
		// Get matching words from API
		const matchingWords = await getMatchingWords(pattern);
		
		// Try each matching word
		for (const word of matchingWords) {
			// Check if we can place this word
			if (!canPlaceWord(grid, blocks, word, currentWord)) {
				continue;
			}
			
			// Check for conflicts
			if (hasConflict(grid, allBlocks, word, currentWord, currentWord.direction)) {
				continue;
			}
			
			// Place the word
			const gridBackup = grid.map((row) => [...row]);
			placeWord(grid, blocks, word, currentWord);
			
			// Recursively try to fill the next word
			if (await backtrack(wordIndex + 1)) {
				return true;
			}
			
			// Backtrack: restore grid
			for (let y = 0; y < grid.length; y++) {
				grid[y] = gridBackup[y];
			}
		}
		
		return false;
	}
	
	const success = await backtrack(0);
	
	return {
		success,
		grid,
		iterations
	};
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

/**
 * Simple autofill with backtracking, word uniqueness, and alternating directions
 */
export async function simpleAutofill(
	crosswordData: CrosswordData,
	acrossBlocks: CrosswordBlock[],
	downBlocks: CrosswordBlock[],
	maxIterations: number = 10000
): Promise<{
	grid: string[][];
	filledCount: number;
	iterations: number;
	success: boolean;
}> {
	// Create a deep copy of the grid
	const grid = crosswordData.grid.map((row) => [...row]);
	const usedWords = new Set<string>();
	let filledCount = 0;
	let iterations = 0;
	
	// Find all empty words
	const emptyWords = findEmptyWords(grid, acrossBlocks, downBlocks);
	
	console.log(`Found ${emptyWords.length} empty words to fill`);
	
	// Separate words by direction
	const acrossWords = emptyWords.filter(w => w.direction === 0);
	const downWords = emptyWords.filter(w => w.direction === 1);
	
	// Shuffle for randomness
	const shuffledAcross = shuffleArray(acrossWords);
	const shuffledDown = shuffleArray(downWords);
	
	// Track which words we've tried for each slot to avoid retrying
	const triedWords = new Map<string, Set<string>>();
	// Track iterations per slot to detect when we're stuck
	const slotIterations = new Map<string, number>();
	
	/**
	 * Backtracking function that alternates between across and down
	 */
	async function backtrack(
		acrossIndex: number,
		downIndex: number,
		nextShouldBeAcross: boolean = true
	): Promise<boolean> {
		iterations++;
		if (iterations > maxIterations) {
			console.log('Max iterations reached');
			return false;
		}
		
		// Check if we've filled all words
		if (acrossIndex >= shuffledAcross.length && downIndex >= shuffledDown.length) {
			return true;
		}
		
		// Determine which direction to work on next (alternate)
		// If one direction is exhausted, use the other
		let currentWordBlock: CrosswordBlock | null = null;
		let currentBlocks: CrosswordBlock[] = [];
		let currentDirection = 0;
		
		if (acrossIndex >= shuffledAcross.length) {
			// Only down words left
			if (downIndex >= shuffledDown.length) return true;
			currentWordBlock = shuffledDown[downIndex];
			currentBlocks = downBlocks;
			currentDirection = 1;
		} else if (downIndex >= shuffledDown.length) {
			// Only across words left
			if (acrossIndex >= shuffledAcross.length) return true;
			currentWordBlock = shuffledAcross[acrossIndex];
			currentBlocks = acrossBlocks;
			currentDirection = 0;
		} else {
			// Both available, alternate based on flag
			if (nextShouldBeAcross) {
				currentWordBlock = shuffledAcross[acrossIndex];
				currentBlocks = acrossBlocks;
				currentDirection = 0;
			} else {
				currentWordBlock = shuffledDown[downIndex];
				currentBlocks = downBlocks;
				currentDirection = 1;
			}
		}
		
		if (!currentWordBlock) return true;
		
		const wordKey = `${currentWordBlock.question.alpha_number}`;
		
		// Check if we have blocks for this word before trying to get pattern
		const wordBlocks = currentBlocks.filter(
			(b) => b.question.alpha_number === currentWordBlock.question.alpha_number
		);
		
		if (wordBlocks.length === 0) {
			console.warn(`No blocks found for word ${wordKey}, skipping`);
			// Skip this word and move to the next
			const nextAcrossIndex = currentDirection === 0 ? acrossIndex + 1 : acrossIndex;
			const nextDownIndex = currentDirection === 1 ? downIndex + 1 : downIndex;
			const nextShouldBe = !nextShouldBeAcross;
			return await backtrack(nextAcrossIndex, nextDownIndex, nextShouldBe);
		}
		
		const pattern = getWordPattern(grid, currentBlocks, currentWordBlock);
		
		// Validate pattern before proceeding
		if (!pattern || pattern.trim() === '') {
			console.warn(`Empty pattern for word ${wordKey}, skipping`);
			// Skip this word and move to the next
			const nextAcrossIndex = currentDirection === 0 ? acrossIndex + 1 : acrossIndex;
			const nextDownIndex = currentDirection === 1 ? downIndex + 1 : downIndex;
			const nextShouldBe = !nextShouldBeAcross;
			return await backtrack(nextAcrossIndex, nextDownIndex, nextShouldBe);
		}
		
		// Track iterations for this slot
		const currentSlotIterations = slotIterations.get(wordKey) || 0;
		slotIterations.set(wordKey, currentSlotIterations + 1);
		
		// If we've tried more than 20 iterations for this slot, backtrack further
		if (currentSlotIterations > 20) {
			console.log(
				`Slot ${wordKey} exceeded 20 iterations (${currentSlotIterations}), backtracking further`
			);
			// Reset iteration count for this slot when backtracking
			slotIterations.delete(wordKey);
			return false;
		}
		
		// Get or create list of words we've already tried for this slot
		if (!triedWords.has(wordKey)) {
			triedWords.set(wordKey, new Set<string>());
		}
		const triedForThisSlot = triedWords.get(wordKey)!;
		
		// Get matching words from API
		const matchingWords = await getMatchingWords(pattern);
		
		// Filter out words we've already used or tried for this slot
		const availableWords = shuffleArray(
			matchingWords.filter(w => !usedWords.has(w) && !triedForThisSlot.has(w))
		);
		
		console.log(
			`Trying word ${currentWordBlock.question.alpha_number} (${currentDirection === 0 ? 'across' : 'down'}), pattern: ${pattern}, available: ${availableWords.length}, slot iterations: ${currentSlotIterations}`
		);
		
		// Try each available word
		for (const word of availableWords) {
			// Mark as tried for this slot
			triedForThisSlot.add(word);
			
			if (!canPlaceWord(grid, currentBlocks, word, currentWordBlock)) {
				continue;
			}
			
			// Check for conflicts at intersections
			let hasConflict = false;
			const wordBlocks = currentBlocks.filter(
				(b) => b.question.alpha_number === currentWordBlock.question.alpha_number
			);
			
			for (let i = 0; i < wordBlocks.length; i++) {
				const block = wordBlocks[i];
				const letter = word[i].toUpperCase();
				const current = grid[block.y]?.[block.x];
				const trimmed = current?.trim() || '';
				
				if (trimmed && trimmed !== '#' && trimmed.toUpperCase() !== letter) {
					hasConflict = true;
					break;
				}
			}
			
			if (hasConflict) {
				continue;
			}
			
			// Place the word
			const gridBackup = grid.map((row) => [...row]);
			placeWord(grid, currentBlocks, word, currentWordBlock);
			usedWords.add(word);
			filledCount++;
			
			console.log(`Placed word ${currentWordBlock.question.alpha_number}: ${word}`);
			
			// Reset iteration count for this slot when we place a word
			slotIterations.delete(wordKey);
			
			// Recursively try next word (alternate direction)
			const nextAcrossIndex = currentDirection === 0 ? acrossIndex + 1 : acrossIndex;
			const nextDownIndex = currentDirection === 1 ? downIndex + 1 : downIndex;
			const nextShouldBe = !nextShouldBeAcross; // Alternate
			
			if (await backtrack(nextAcrossIndex, nextDownIndex, nextShouldBe)) {
				return true;
			}
			
			// Backtrack: restore grid and remove word from used set
			for (let y = 0; y < grid.length; y++) {
				grid[y] = gridBackup[y];
			}
			usedWords.delete(word);
			filledCount--;
			
			console.log(`Backtracked from word ${currentWordBlock.question.alpha_number}`);
		}
		
		// If we've tried all words for this slot and none worked, backtrack further
		return false;
	}
	
	// Start backtracking - alternate starting with across
	const success = await backtrack(0, 0, true);
	
	console.log(`Autofill ${success ? 'completed' : 'stopped'}. Filled ${filledCount} words in ${iterations} iterations`);
	
	return {
		grid,
		filledCount,
		iterations,
		success
	};
}

