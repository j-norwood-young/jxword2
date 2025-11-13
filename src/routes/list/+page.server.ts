import type { PageServerLoad } from './$types';

export const load = (async ({ url }) => {
	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const limit = parseInt(url.searchParams.get('limit') || '50', 10);

	try {
		const response = await fetch(`${url.origin}/api/crosswords?page=${page}&limit=${limit}`);
		
		if (!response.ok) {
			return {
				error: `Failed to fetch crosswords: ${response.status}`,
				crosswords: [],
				total: 0,
				page: 1,
				limit
			};
		}

		const data = await response.json();
		return {
			crosswords: data.data || [],
			total: data.total || 0,
			page: data.page || page,
			limit
		};
	} catch (error) {
		console.error('Error loading crosswords:', error);
		return {
			error: 'Failed to load crosswords',
			crosswords: [],
			total: 0,
			page: 1,
			limit
		};
	}
}) satisfies PageServerLoad;