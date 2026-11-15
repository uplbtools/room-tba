import { clearSessionCookie } from '#lib/admin/auth.js';
import { editorSessionOrUnauthorized } from '#lib/admin/require-editor.js';
import { json } from '#lib/api/json.js';
import { bumpSessionVersion } from '#lib/services/admin/session-version.js';
import type { RequestHandler } from './$types';

/** Every cookie issued before this, this device's included, stops working. */
export const POST: RequestHandler = async ({ cookies }) => {
	const auth = await editorSessionOrUnauthorized(cookies);
	if (auth instanceof Response) return auth;

	try {
		await bumpSessionVersion(auth.session.id);
	} catch (error) {
		console.error('Sign out everywhere failed:', error);
		return json({ error: "Couldn't sign out other devices. Try again." }, 500);
	}
	return new Response(JSON.stringify({ success: true }), {
		headers: {
			'Content-Type': 'application/json',
			'Set-Cookie': clearSessionCookie()
		}
	});
};
