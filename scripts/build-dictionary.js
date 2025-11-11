import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Build script to pre-process all dictionary files into a single JSON file
 * organized by word length for efficient lookup
 */

const dictionaryFiles = [
	join(__dirname, '../src/lib/suggestions/english.txt'),
	join(__dirname, '../src/lib/suggestions/names.txt'),
	join(__dirname, '../src/lib/suggestions/google-10000-english-no-swears.txt')
];

// Also import words.js
const wordsPath = join(__dirname, '../src/lib/suggestions/words.js');
const wordsModule = await import(wordsPath);
const words = wordsModule.default || [];

function processDictionaryFiles() {
	const allWords = new Set();
	
	// Add words from words.js
	for (const word of words) {
		if (word && typeof word === 'string') {
			const clean = word.trim().toUpperCase();
			if (clean.length > 0 && /^[A-Z]+$/.test(clean)) {
				allWords.add(clean);
			}
		}
	}
	
	// Process each dictionary file
	for (const filePath of dictionaryFiles) {
		try {
			const content = readFileSync(filePath, 'utf-8');
			const lines = content.split('\n');
			
			for (const line of lines) {
				const word = line.trim();
				if (word.length > 0 && /^[a-zA-Z]+$/.test(word)) {
					const clean = word.toUpperCase();
					allWords.add(clean);
				}
			}
			
			console.log(`Processed ${filePath}: ${lines.length} lines`);
		} catch (error) {
			console.warn(`Could not process ${filePath}:`, error);
		}
	}
	
	console.log(`Total unique words: ${allWords.size}`);
	
	// Organize by length
	const dictionaryByLength = {};
	
	for (const word of allWords) {
		const length = word.length;
		if (!dictionaryByLength[length]) {
			dictionaryByLength[length] = [];
		}
		dictionaryByLength[length].push(word);
	}
	
	// Sort each length array
	for (const length in dictionaryByLength) {
		dictionaryByLength[length].sort();
	}
	
	return dictionaryByLength;
}

// Run the build
const dictionary = processDictionaryFiles();
const outputPath = join(__dirname, '../src/lib/autofill/dictionary.json');
writeFileSync(outputPath, JSON.stringify(dictionary, null, 2), 'utf-8');

console.log(`Dictionary saved to ${outputPath}`);
console.log(`Word lengths: ${Object.keys(dictionary).length}`);
console.log(`Total words: ${Object.values(dictionary).reduce((sum, arr) => sum + arr.length, 0)}`);

