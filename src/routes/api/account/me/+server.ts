import { editorSessionOrUnauthorized } from '#lib/admin/require-editor.js';
import {
	AccountActionError,
	getAccountProfile,
	updateAccountProfile
} from '#lib/services/admin/user.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	const auth = await editorSessionOrUnauthorized(cookies);
	if (auth instanceof Response) return auth;

	const profile = await getAccountProfile(auth.session.id);
	if (!profile) return json({ error: 'Account not found.' }, 404);
	return json(profile);
};

export const PATCH: RequestHandler = async ({ cookies, request }) => {
	const auth = await editorSessionOrUnauthorized(cookies);
	if (auth instanceof Response) return auth;

	let body: {
		displayName?: string;
		avatarUrl?: string | null;
		profileUrl?: string | null;
		showInCredits?: boolean;
	};
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, 400);
	}

	if (typeof body.displayName !== 'string') {
		return json({ error: 'displayName is required.' }, 400);
	}
	if (
		(body.avatarUrl !== undefined &&
			body.avatarUrl !== null &&
			typeof body.avatarUrl !== 'string') ||
		(body.profileUrl !== undefined &&
			body.profileUrl !== null &&
			typeof body.profileUrl !== 'string') ||
		(body.showInCredits !== undefined && typeof body.showInCredits !== 'boolean')
	) {
		return json({ error: 'Invalid profile fields.' }, 400);
	}

	try {
		// Destructured so the `typeof displayName !== "string"` guard above narrows
		// it to `string` at the call site — narrowing a property does not carry
		// through when the whole object is passed along.
		await updateAccountProfile(auth.session.id, {
			...body,
			displayName: body.displayName
		});
		const profile = await getAccountProfile(auth.session.id);
		return json({ success: true, profile });
	} catch (error) {
		if (error instanceof AccountActionError) {
			return json({ error: error.message }, error.status);
		}
		console.error('Update account profile failed:', error);
		return json({ error: 'Failed to update account profile.' }, 500);
	}
};

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}
