import { createEntityPatchRoute } from '#lib/admin/entity-patch-route.js';
import { errorResponse } from '#lib/api/json.js';
import { type CollegeAdmin, updateCollege } from '#lib/services/admin/actions.js';
import type { RequestHandler } from './$types';

type CollegePatchBody = {
	collegeName?: string;
	version?: number;
};

export const PATCH: RequestHandler = createEntityPatchRoute<CollegeAdmin, string>({
	entityLabel: 'college',
	responseKey: 'college',
	validateAndBuild: (body) => {
		const b = body as CollegePatchBody;
		if (!b.collegeName || b.collegeName.trim().length === 0) {
			return {
				ok: false,
				response: errorResponse('College name is required', 400)
			};
		}
		return { ok: true, input: b.collegeName.trim(), version: b.version };
	},
	update: updateCollege
});
