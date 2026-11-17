import { getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
import { canPublishDirectly, sessionPublishingActor } from '#lib/admin/auth.js';
import { optionalEditorSession } from '#lib/admin/require-editor.js';
import { enforceProposalSubmitLimits } from '#lib/api/proposal-rate-limit.js';
import { clientIp } from '#lib/api/rate-limit.js';
import { DuplicateNameError, EditConflictError } from '#lib/services/admin/actions.js';
import {
	emitProposalSubmitted,
	logNotificationEmitFailure
} from '#lib/utils/notifications/proposal-events.js';
import {
	ProposalValidationError,
	submitProposal,
	type ProposalCreateType
} from './proposal-action.js';

type EntityEdit = {
	entityType:
		'building' | 'college' | 'division' | 'dorm' | 'event' | 'organization' | 'place' | 'room';
	meta: { entityId: number; baseVersion: number; submitterName: string };
	body: Record<string, unknown>;
	current: Record<string, unknown>;
	publish: (patch: Record<string, unknown>, editedBy: string) => Promise<unknown>;
};

/** Editors publish the changed fields. Everyone else files them as a proposal. */
export async function saveEntityEdit({ entityType, meta, body, current, publish }: EntityEdit) {
	const session = await optionalEditorSession(getRequestEvent().cookies);
	const patch = Object.fromEntries(
		Object.entries(body)
			.filter(([key, value]) => value !== undefined && value !== (current[key] ?? ''))
			.map(([key, value]) => [key, value === '' ? null : value])
	);
	if (Object.keys(patch).length === 0) error(400, 'No changes to submit.');

	if (session && canPublishDirectly(session.role)) {
		try {
			await publish(patch, sessionPublishingActor(session));
		} catch (err) {
			if (err instanceof EditConflictError)
				error(409, 'Someone else changed this. Reload and try again.');
			if (err instanceof DuplicateNameError) error(409, err.message);
			throw err;
		}
		return { published: true };
	}

	await fileProposal(session, {
		entityType,
		entityId: meta.entityId,
		baseVersion: meta.baseVersion,
		patch,
		submitterName: meta.submitterName
	});
	return { published: false };
}

/** Editors publish the new entry. Everyone else files it as a proposal. */
export async function saveEntityCreate<T extends { id: number }>({
	entityType,
	meta,
	patch,
	publish
}: {
	entityType: ProposalCreateType;
	meta: { submitterName: string };
	patch: Record<string, unknown>;
	publish: (patch: Record<string, unknown>, editedBy: string) => Promise<T | null>;
}) {
	const session = await optionalEditorSession(getRequestEvent().cookies);
	if (session && canPublishDirectly(session.role)) {
		const created = await publish(patch, sessionPublishingActor(session));
		if (!created) error(500, "Couldn't add it.");
		return { published: true, id: created.id };
	}
	await fileProposal(session, {
		entityType,
		entityId: 0,
		baseVersion: 0,
		patch,
		submitterName: meta.submitterName
	});
	return { published: false, id: null };
}

async function fileProposal(
	session: Awaited<ReturnType<typeof optionalEditorSession>>,
	input: Omit<Parameters<typeof submitProposal>[0], 'submitterUserId'>
) {
	if (enforceProposalSubmitLimits(session, clientIp(getRequestEvent().request)))
		error(429, 'Too many suggestions. Try again in a few minutes.');
	try {
		const proposal = await submitProposal({
			...input,
			submitterName: session?.displayName || session?.username || input.submitterName,
			submitterUserId: session && session.id > 0 ? session.id : null
		});
		await emitProposalSubmitted(proposal, session?.id).catch((err) =>
			logNotificationEmitFailure('Notification emit failed', err)
		);
	} catch (err) {
		if (err instanceof ProposalValidationError) error(400, err.message);
		throw err;
	}
}
