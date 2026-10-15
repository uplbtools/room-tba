import { editorSessionOrUnauthorized } from '#lib/admin/require-editor.js';
import {
	countPendingProposals,
	listPendingProposalsForReview
} from '#lib/services/contribution/proposal-action.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies }) => {
	const auth = await editorSessionOrUnauthorized(cookies, {
		requireReview: true
	});
	if (auth instanceof Response) return auth;

	const [proposals, pendingCount] = await Promise.all([
		listPendingProposalsForReview(),
		countPendingProposals()
	]);

	return json({ proposals, pendingCount });
};

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}
