import { editorSessionOrUnauthorized } from '#lib/admin/require-editor.js';
import { exportAccountData } from '#lib/services/admin/user.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	const auth = await editorSessionOrUnauthorized(cookies);
	if (auth instanceof Response) return auth;

	const data = await exportAccountData(auth.session.id);
	if (!data) {
		return new Response(JSON.stringify({ error: 'Account not found.' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	return new Response(JSON.stringify(data, null, 2), {
		status: 200,
		headers: {
			'Content-Type': 'application/json',
			'Content-Disposition': `attachment; filename="room-tba-account-${auth.session.id}.json"`
		}
	});
};
