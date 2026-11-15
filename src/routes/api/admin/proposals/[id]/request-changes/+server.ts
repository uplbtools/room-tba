import { clientIp } from '#lib/api/rate-limit.js';
import { recordAudit } from '#lib/services/admin/audit-log.js';
import { editorSessionOrUnauthorized } from '#lib/admin/require-editor.js';
import {
	emitProposalReviewed,
	logNotificationEmitFailure
} from '#lib/utils/notifications/proposal-events.js';
import {
	ProposalActionError,
	ProposalValidationError,
	requestProposalChanges
} from '#lib/services/contribution/proposal-action.js';
import type { RequestHandler } from './$types';

type RequestChangesBody = { note?: string };

export const POST: RequestHandler = async ({ cookies, params, request }) => {
	const auth = await editorSessionOrUnauthorized(cookies, {
		requireReview: true
	});
	if (auth instanceof Response) return auth;

	const id = Number(params.id);
	if (!Number.isInteger(id)) return json({ error: 'Invalid proposal ID' }, 400);

	const body = await request.json().catch(() => ({}) as RequestChangesBody);

	try {
		const proposal = await requestProposalChanges(id, auth.session, body.note);
		if (proposal) {
			await recordAudit({
				action: 'proposal.changes_requested',
				actor: auth.session,
				targetUserId: proposal.submitterUserId ?? null,
				targetLabel: proposal.submitterName,
				detail: { proposalId: proposal.id, entityLabel: proposal.entityLabel },
				ip: clientIp(request)
			});
			await emitProposalReviewed(proposal, 'needs_changes').catch((err) => {
				logNotificationEmitFailure('Proposal reviewed notification failed', err);
			});
		}
		return json({ success: true, proposal });
	} catch (err) {
		if (err instanceof ProposalValidationError) {
			return json({ error: err.message }, 400);
		}
		if (err instanceof ProposalActionError) {
			return json({ error: err.message }, err.status);
		}
		console.error('Failed to request proposal changes:', err);
		return json({ error: 'Failed to update proposal' }, 500);
	}
};

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}
