import { getRequestEvent, query } from '$app/server';
import * as v from 'valibot';
import { optionalEditorSession } from '#lib/admin/require-editor.js';
import {
	getContributorLeaderboard,
	getContributorStanding,
	type ContributionSource
} from '#lib/services/contribution/contributor-action.js';

const params = v.object({
	window: v.picklist(['month', 'semester', 'all']),
	board: v.picklist(['community', 'editors'])
});

const SOURCES = {
	community: 'proposal_approved',
	editors: 'editor_published'
} as const satisfies Record<string, ContributionSource>;

export const getLeaderboard = query(params, ({ window, board }) =>
	getContributorLeaderboard(window, SOURCES[board])
);

export const getMyStanding = query(params, async ({ window, board }) => {
	const session = await optionalEditorSession(getRequestEvent().cookies);
	return session && session.id > 0
		? getContributorStanding(window, SOURCES[board], session.id)
		: null;
});
