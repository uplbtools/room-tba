import { editorSessionOrUnauthorized } from '$lib/admin/require-editor';
import { removeContributorSocialLink } from '$lib/services/contribution/contributor-profile';
import type { RequestHandler } from './$types';
import {
	errorFromContributorProfile,
	json,
	parsePositiveId,
	readReason,
	serverError
} from '../../route-utils';

export const DELETE: RequestHandler = async ({ cookies, params, request }) => {
	const auth = await editorSessionOrUnauthorized(cookies, { requireAdmin: true });
	if (auth instanceof Response) return auth;

	const profileId = parsePositiveId(params.id);
	const linkId = parsePositiveId(params.linkId);
	if (profileId === null || linkId === null) return json({ error: 'Invalid contributor or social link ID.' }, 400);

	const parsed = await readReason(request);
	if (!parsed.ok) return parsed.response;

	try {
		const profile = await removeContributorSocialLink(profileId, linkId, auth.session.id, parsed.reason);
		return json({ success: true, profile });
	} catch (error) {
		const response = errorFromContributorProfile(error);
		if (response) return response;
		return serverError('Failed to remove social link.', error);
	}
};
