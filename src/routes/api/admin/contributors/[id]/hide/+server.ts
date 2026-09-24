import { editorSessionOrUnauthorized } from '$lib/admin/require-editor';
import {
	hideContributorProfile
} from '$lib/services/contribution/contributor-profile';
import type { RequestHandler } from './$types';
import {
	errorFromContributorProfile,
	json,
	parsePositiveId,
	readReason,
	serverError
} from '../route-utils';

export const POST: RequestHandler = async ({ cookies, params, request }) => {
	const auth = await editorSessionOrUnauthorized(cookies, { requireAdmin: true });
	if (auth instanceof Response) return auth;
	const profileId = parsePositiveId(params.id);
	if (profileId === null) return json({ error: 'Invalid contributor profile ID.' }, 400);

	const parsed = await readReason(request);
	if (!parsed.ok) return parsed.response;

	try {
		const profile = await hideContributorProfile(profileId, auth.session.id, parsed.reason);
		return json({ success: true, profile });
	} catch (error) {
		const response = errorFromContributorProfile(error);
		if (response) return response;
		return serverError('Failed to hide contributor profile.', error);
	}
};
