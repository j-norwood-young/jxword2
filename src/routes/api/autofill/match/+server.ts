import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getMatchingWords } from '$lib/autofill/dictionary.js';

/**
 * API endpoint for pattern matching
 * GET /api/autofill/match?pattern=HELLO
 * Returns words that match the pattern
 */
export const GET: RequestHandler = async ({ url }) => {
	const pattern = url.searchParams.get('pattern');
	
	if (!pattern || pattern.trim() === '') {
		return json({ error: 'Pattern parameter required and cannot be empty' }, { status: 400 });
	}
	
	// Validate pattern (only letters and ?)
	const trimmedPattern = pattern.trim();
	// If no ?'s, return single word
	if (!trimmedPattern.includes('?')) {
		return json({
			pattern: trimmedPattern,
			matches: [trimmedPattern],
			count: 1
		});
	}
	// Validate pattern (only letters and ?)
	if (!/^[A-Za-z?]+$/.test(trimmedPattern)) {
		console.error('Invalid pattern received:', JSON.stringify(trimmedPattern));
		return json({ 
			error: 'Pattern must contain only letters and ?', 
			received: trimmedPattern 
		}, { status: 400 });
	}
	
	const upperPattern = trimmedPattern.toUpperCase();
	const matches = getMatchingWords(upperPattern);
	
	return json({
		pattern: upperPattern,
		matches,
		count: matches.length
	});
};

