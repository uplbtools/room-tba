import { editorSessionOrUnauthorized } from '$lib/admin/require-editor';
import { listContributorProfileAudits } from '$lib/services/contribution/contributor-profile';
import type { RequestHandler } from './$types';
import {
	errorFromContributorProfile,
	json,
	parsePaginationParam,
	parsePositiveId,
	serverError
} from '../route-utils';

export const GET: RequestHandler = async ({ cookies, params, url }) => {
	const auth = await editorSessionOrUnauthorized(cookies, { requireAdmin: true });
	if (auth instanceof Response) return auth;

	const profileId = parsePositiveId(params.id);
	if (profileId === null) return json({ error: 'Invalid contributor profile ID.' }, 400);

	const limit = parsePaginationParam(url.searchParams.get('limit'), 'limit');
	const offset = parsePaginationParam(url.searchParams.get('offset'), 'offset');
	if (Number.isNaN(limit) || Number.isNaN(offset)) {
		return json({ error: 'Invalid audit pagination.' }, 400);
	}

	try {
		const audits = await listContributorProfileAudits(profileId, {
			...(limit === null ? {} : { limit }),
			...(offset === null ? {} : { offset })
		});
		return json(audits);
	} catch (error) {
		const response = errorFromContributorProfile(error);
		if (response) return response;
		return serverError('Failed to load contributor audit history.', error);
	}
};
