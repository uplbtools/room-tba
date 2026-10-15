import { editorSessionOrUnauthorized } from '#lib/admin/require-editor.js';
import { getPlannerData, savePlannerData } from '#lib/services/planner.js';
import type { RequestHandler } from './$types';

// Return the signed-in user's saved planner blob (any logged-in role).
export const GET: RequestHandler = async ({ cookies }) => {
	const auth = await editorSessionOrUnauthorized(cookies);
	if (auth instanceof Response) return auth;

	try {
		const data = await getPlannerData(auth.session.id);
		return json({ data });
	} catch (error) {
		// Degrade gracefully if the table isn't present yet (migration pending):
		// the client keeps its localStorage plans instead of erroring.
		console.error('Load planner failed:', error);
		return json({ data: null });
	}
};

// Upsert the user's planner blob. Body: { data: PlannerPersisted }.
export const PUT: RequestHandler = async ({ cookies, request }) => {
	const auth = await editorSessionOrUnauthorized(cookies);
	if (auth instanceof Response) return auth;

	let body: { data?: unknown };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, 400);
	}

	const data = body.data;
	if (data == null || typeof data !== 'object') {
		return json({ error: 'data (planner blob) is required.' }, 400);
	}
	if (!Array.isArray((data as { plans?: unknown }).plans)) {
		return json({ error: 'data.plans must be an array.' }, 400);
	}

	try {
		await savePlannerData(auth.session.id, data);
		return json({ success: true });
	} catch (error) {
		console.error('Save planner failed:', error);
		return json({ error: 'Failed to save planner.' }, 500);
	}
};

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}
