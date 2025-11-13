import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { WHITEBEARD_API_URL, WHITEBEARD_API_KEY } from '$env/static/private';

/**
 * API endpoint for fetching a single crossword from CMS
 * GET /api/crosswords/{id}
 * Returns the full crossword data from CMS
 */
export const GET: RequestHandler = async ({ params }) => {
	const id = params.id;
	const apiUrl = WHITEBEARD_API_URL;
	const apiKey = WHITEBEARD_API_KEY;
	
	if (!id) {
		return json({ error: 'Crossword ID is required' }, { status: 400 });
	}
	
	if (!apiUrl) {
		return json({ error: 'WHITEBEARD_API_URL environment variable is not set' }, { status: 500 });
	}
	
	if (!apiKey) {
		return json({ error: 'WHITEBEARD_API_KEY environment variable is not set' }, { status: 500 });
	}
	
	try {
		const cmsUrl = `${apiUrl}/cms/content/${id}`;
		const response = await fetch(cmsUrl, {
			headers: {
				'API-Key': apiKey
			}
		});
		
		if (!response.ok) {
			return json(
				{ error: `Failed to fetch crossword: ${response.status} ${response.statusText}` },
				{ status: response.status }
			);
		}
		
		const data = await response.json();
		return json(data.data[0]);
	} catch (error) {
		console.error('Error fetching crossword:', error);
		return json(
			{ error: 'Failed to fetch crossword from CMS', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};

/**
 * API endpoint for updating a crossword in CMS
 * POST /api/crosswords/{id}
 * Updates the crossword data in CMS
 */
export const POST: RequestHandler = async ({ params, request }) => {
	const id = params.id;
	const apiUrl = WHITEBEARD_API_URL;
	const apiKey = WHITEBEARD_API_KEY;
	
	if (!id) {
		return json({ error: 'Crossword ID is required' }, { status: 400 });
	}
	
	if (!apiUrl) {
		return json({ error: 'WHITEBEARD_API_URL environment variable is not set' }, { status: 500 });
	}
	
	if (!apiKey) {
		return json({ error: 'WHITEBEARD_API_KEY environment variable is not set' }, { status: 500 });
	}
	
	try {
		const body = await request.json();
		
		const cmsUrl = `${apiUrl}/cms/content/${id}`;
		const response = await fetch(cmsUrl, {
			method: 'POST',
			headers: {
				'API-Key': apiKey,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body)
		});
		
		if (!response.ok) {
			const errorText = await response.text();
			return json(
				{ error: `Failed to update crossword: ${response.status} ${response.statusText}`, details: errorText },
				{ status: response.status }
			);
		}
		
		const data = await response.json();
		return json(data);
	} catch (error) {
		console.error('Error updating crossword:', error);
		return json(
			{ error: 'Failed to update crossword in CMS', details: error instanceof Error ? error.message : 'Unknown error' },
			{ status: 500 }
		);
	}
};

