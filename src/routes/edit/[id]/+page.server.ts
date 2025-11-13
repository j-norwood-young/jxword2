import type { PageServerLoad } from './$types';

export const load = (async ({ params, url }) => {
	const id = params.id;
	
	if (!id) {
		return {
			error: 'Crossword ID is required',
			crossword: null
		};
	}
	
	try {
		const response = await fetch(`${url.origin}/api/crosswords/${id}`);
		
		if (!response.ok) {
			return {
				error: `Failed to fetch crossword: ${response.status}`,
				crossword: null,
				id
			};
		}
		
		const crossword = await response.json();
		return {
			crossword,
			id,
			error: null
		};
	} catch (error) {
		console.error('Error loading crossword:', error);
		return {
			error: 'Failed to load crossword',
			crossword: null,
			id
		};
	}
}) satisfies PageServerLoad;

