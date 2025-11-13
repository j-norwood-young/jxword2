import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { WHITEBEARD_API_URL, WHITEBEARD_API_KEY } from '$env/static/private';

/**
 * API endpoint for fetching crosswords from CMS
 * GET /api/crosswords?page=1&limit=10
 * Returns simplified crossword list with images, link, title, publish date, and data
 */
export const GET: RequestHandler = async ({ url }) => {
	const page = url.searchParams.get('page') || '1';
	const limit = url.searchParams.get('limit') || '10';
	
	const apiUrl = WHITEBEARD_API_URL;
	const apiKey = WHITEBEARD_API_KEY;
	
	if (!apiUrl) {
		return json({ error: 'WHITEBEARD_API_URL environment variable is not set' }, { status: 500 });
	}
	
	if (!apiKey) {
		return json({ error: 'WHITEBEARD_API_KEY environment variable is not set' }, { status: 500 });
	}
	
	try {
		const cmsUrl = `${apiUrl}/cms/publication/1/content?content_type=7&page=${page}&limit=${limit}`;
		const response = await fetch(cmsUrl, {
			headers: {
				'API-Key': apiKey
			}
		});
		
		if (!response.ok) {
			return json(
				{ error: `Failed to fetch crosswords: ${response.status} ${response.statusText}` },
				{ status: response.status }
			);
		}
		
		const data = await response.json();
		
		// Transform the response to only include needed fields
		const simplifiedData = {
			total: data.total,
			page: data.page,
			data: data.data?.map((item: any) => {
				// Extract image URLs from attachments
				const attachment = item.attachments?.[0];
				const imageSmall = attachment?.url_thumbnail || null;
				const imageMedium = attachment?.url_medium || null;
				const imageLarge = attachment?.url_large || null;
				
				return {
					id: item.id,
					title: item.title,
					link: item.url,
					publishDate: item.firstPublished,
					data: item.data,
					imageSmall,
					imageMedium,
					imageLarge
				};
			}) || []
		};
		
		return json(simplifiedData);
	} catch (error) {
		console.error('Error fetching crosswords:', error);
		return json(
			{ error: 'Failed to fetch crosswords from CMS', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};

