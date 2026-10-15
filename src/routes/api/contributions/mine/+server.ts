import { editorSessionOrUnauthorized } from '#lib/admin/require-editor.js';
import { getMyContributions } from '#lib/services/contribution/contributor-action.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	const auth = await editorSessionOrUnauthorized(cookies);
	if (auth instanceof Response) return auth;

	try {
		return json({ contributions: await getMyContributions(auth.session.id) });
	} catch (error) {
		console.error('my contributions query failed:', error);
		return json({ error: 'Contributions are temporarily unavailable.' }, 500);
	}
};

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}
