import { simpleAutofill } from '$lib/autofill/autofill.js';
import { isWordValid } from '$lib/autofill/dictionary.js';
import type { CrosswordData, CrosswordBlock } from '$lib/types/Crossword';
import { generateAcrossScalar, generateDownScalar } from '$lib/libs/crossword_utils.js';

const SIZE = 5;
/**
 * Create a small test crossword grid
 * This is a simple 5x5 grid with some words
 */
function createTestCrossword(): {
	crosswordData: CrosswordData;
	acrossBlocks: CrosswordBlock[];
	downBlocks: CrosswordBlock[];
} {
	// Create a 5x5 grid
	const grid: string[][] = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => ''));

	// Add some random '#' to the grid to make it more challenging
	for (let i = 0; i < SIZE; i++) {
		for (let j = 0; j < SIZE; j++) {
			grid[i][j] =  Math.random() < 0.2 ? '#' : " ";
		}
	}

	console.log(grid.map(row => row.join(' ')).join('\n').replaceAll('#', '⬛').replaceAll(' ', '⬜'));

	const acrossBlocks = generateAcrossScalar(grid, { across: [], down: [] });
	const downBlocks = generateDownScalar(grid, { across: [], down: [] });

	const crosswordData: CrosswordData = {
		title: 'Test Crossword',
		author: '',
		date: '',
		difficulty: '',
		type: '',
		copyright: '',
		grid,
		clues: {
			across: [],
			down: []
		}
	};

	return { crosswordData, acrossBlocks, downBlocks };
}

/**
 * Test the autofill algorithm and measure performance
 */
export async function testAutofill(runs: number = 5): Promise<void> {
	console.log('='.repeat(60));
	console.log('AUTOFILL ALGORITHM TEST');
	console.log('='.repeat(60));
	
	const results: Array<{
		run: number;
		success: boolean;
		time: number;
		filledCount: number;
		iterations: number;
		invalidWords: number;
	}> = [];

	for (let run = 1; run <= runs; run++) {
		console.log(`\n--- Run ${run}/${runs} ---`);
		
		const { crosswordData, acrossBlocks, downBlocks } = createTestCrossword();
		
		// Measure time
		const startTime = performance.now();
		
		// Create timeout promise
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => reject(new Error('Timeout after 1 second')), 1000);
		});
		
		try {
			// Race between autofill and timeout
			const result = await Promise.race([
				simpleAutofill(crosswordData, acrossBlocks, downBlocks),
				timeoutPromise
			]);
			
			const endTime = performance.now();
			const timeMs = endTime - startTime;
			
			// Check if grid is filled - verify ALL non-blocked cells have letters
			let allFilled = true;
			const invalidWords: string[] = [];
			
			// First, check that all non-blocked cells are filled
			for (let row = 0; row < result.grid.length; row++) {
				for (let col = 0; col < result.grid[row].length; col++) {
					const cell = result.grid[row]?.[col];
					// If it's not a blocked cell (#), it must have a letter
					if (cell !== '#' && (!cell || !cell.trim() || cell.trim().length === 0)) {
						allFilled = false;
						break;
					}
				}
				if (!allFilled) break;
			}
			
			// Then validate all words are valid dictionary words
			for (const block of [...acrossBlocks, ...downBlocks]) {
				if (block.startOfWord) {
					const wordBlocks = (block.direction === 0 ? acrossBlocks : downBlocks).filter(
						b => b.question.alpha_number === block.question.alpha_number
					);
					
					// Build the word from the grid
					let word = '';
					for (const wb of wordBlocks) {
						const cell = result.grid[wb.y]?.[wb.x];
						if (cell && cell.trim()) {
							word += cell.trim().toUpperCase();
						}
					}
					
					// Validate word is in dictionary
					if (word && !isWordValid(word)) {
						invalidWords.push(`${block.question.alpha_number}: "${word}"`);
					}
				}
			}
			
			const allWordsValid = invalidWords.length === 0;
			const success = allFilled && result.filledCount > 0 && allWordsValid;
			
			results.push({
				run,
				success,
				time: timeMs,
				filledCount: result.filledCount,
				iterations: result.iterations || 0,
				invalidWords: invalidWords.length
			});
			
			console.log(`✓ Success: ${success}`);
			console.log(`  Time: ${timeMs.toFixed(2)}ms`);
			console.log(`  Words filled: ${result.filledCount}`);
			console.log(`  Grid filled: ${allFilled}`);
			console.log(`  All words valid: ${allWordsValid}`);
			
			if (invalidWords.length > 0) {
				console.log(`  Invalid words (${invalidWords.length}):`);
				invalidWords.forEach(word => console.log(`    - ${word}`));
			}
			
			// Print grid
			console.log('\n  Result grid:');
			result.grid.forEach((row, i) => {
				console.log(`  ${i}: ${row.map(c => c || ' ').join(' ')}`);
			});
			
		} catch (error) {
			const endTime = performance.now();
			const timeMs = endTime - startTime;
			
			const isTimeout = error instanceof Error && error.message.includes('Timeout');
			
			results.push({
				run,
				success: false,
				time: timeMs,
				filledCount: 0,
				iterations: 0,
				invalidWords: 0
			});
			
			if (isTimeout) {
				console.error(`✗ Timeout after ${timeMs.toFixed(2)}ms`);
			} else {
				console.error(`✗ Failed: ${error}`);
			}
		}
	}
	
	// Print summary
	console.log('\n' + '='.repeat(60));
	console.log('SUMMARY');
	console.log('='.repeat(60));
	
	const successful = results.filter(r => r.success);
	const successRate = (successful.length / results.length) * 100;
	
	console.log(`Success rate: ${successRate.toFixed(1)}% (${successful.length}/${results.length})`);
	
	if (successful.length > 0) {
		const avgTime = successful.reduce((sum, r) => sum + r.time, 0) / successful.length;
		const avgFilled = successful.reduce((sum, r) => sum + r.filledCount, 0) / successful.length;
		const avgIterations = successful.reduce((sum, r) => sum + r.iterations, 0) / successful.length;
		const minTime = Math.min(...successful.map(r => r.time));
		const maxTime = Math.max(...successful.map(r => r.time));
		const minIterations = Math.min(...successful.map(r => r.iterations));
		const maxIterations = Math.max(...successful.map(r => r.iterations));
		
		console.log(`\nAverage time: ${avgTime.toFixed(2)}ms`);
		console.log(`Time range: ${minTime.toFixed(2)}ms - ${maxTime.toFixed(2)}ms`);
		console.log(`Average words filled: ${avgFilled.toFixed(1)}`);
		console.log(`Average iterations: ${avgIterations.toFixed(0)}`);
		console.log(`Iteration range: ${minIterations} - ${maxIterations}`);
	}
	
	console.log('\nDetailed results:');
	results.forEach(r => {
		const status = r.success ? '✓' : '✗';
		const invalid = r.invalidWords > 0 ? `, ${r.invalidWords} invalid words` : '';
		console.log(`  ${status} Run ${r.run}: ${r.time.toFixed(2)}ms, ${r.filledCount} words, ${r.iterations} iterations${invalid}`);
	});
}

// Run test if this file is executed directly
if (typeof window !== 'undefined') {
	// Browser environment - expose for console testing
	(window as Window & { testAutofill?: typeof testAutofill }).testAutofill = testAutofill;
}

