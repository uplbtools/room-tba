import { editorSessionOrUnauthorized } from '$lib/admin/require-editor';
import { restoreContributorProfile } from '$lib/services/contribution/contributor-profile';
import type { RequestHandler } from './$types';
import {
	errorFromContributorProfile,
	json,
	parsePositiveId,
	serverError
} from '../route-utils';

export const POST: RequestHandler = async ({ cookies, params }) => {
	const auth = await editorSessionOrUnauthorized(cookies, { requireAdmin: true });
	if (auth instanceof Response) return auth;

	const profileId = parsePositiveId(params.id);
	if (profileId === null) return json({ error: 'Invalid contributor profile ID.' }, 400);

	try {
		const profile = await restoreContributorProfile(profileId, auth.session.id);
		return json({ success: true, profile });
	} catch (error) {
		const response = errorFromContributorProfile(error);
		if (response) return response;
		return serverError('Failed to restore contributor profile.', error);
	}
};
