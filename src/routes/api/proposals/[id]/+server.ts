import { canReviewProposals } from '#lib/admin/auth.js';
import { getEditorSession } from '#lib/admin/require-editor.js';
import {
	canViewProposalSubmitterDetails,
	getProposalById,
	toPublicProposalView,
	toSubmitterProposalView
} from '#lib/services/contribution/proposal-action.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, params }) => {
	const id = Number(params.id);
	if (!Number.isInteger(id)) {
		return json({ error: 'Invalid proposal ID' }, 400);
	}

	const proposal = await getProposalById(id);
	if (!proposal) return json({ error: 'Proposal not found' }, 404);

	const session = getEditorSession(cookies);

	if (session && canReviewProposals(session.role)) {
		return json({ proposal });
	}

	if (canViewProposalSubmitterDetails(session, proposal)) {
		return json({ proposal: toSubmitterProposalView(proposal) });
	}

	return json({ proposal: toPublicProposalView(proposal) });
};

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}
