import { getEditorCredits } from '$lib/services/contribution/editor-credits';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const credits = await getEditorCredits();

	return new Response(JSON.stringify(credits), {
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'private, no-store'
		}
	});
};
