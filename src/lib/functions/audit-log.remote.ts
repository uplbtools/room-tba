import { error } from '@sveltejs/kit';
import { getRequestEvent, query } from '$app/server';
import * as v from 'valibot';
import { optionalEditorSession } from '#lib/admin/require-editor.js';
import { listAuditLog } from '#lib/services/admin/audit-log.js';

export const getAuditLog = query(
	v.nullable(v.pipe(v.number(), v.integer(), v.minValue(1))),
	async (before) => {
		const session = await optionalEditorSession(getRequestEvent().cookies);
		if (session?.role !== 'admin') error(403, 'Only admins can see the audit log.');
		return listAuditLog(before);
	}
);
