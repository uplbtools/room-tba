import { command, form, getRequestEvent, query } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { optionalEditorSession } from '#lib/admin/require-editor.js';
import {
	isDigestEnabled,
	readUnsubscribeToken,
	setTopicEnabled
} from '#lib/services/email/unsubscribe.js';

/** Turns off the email topic named by an unsubscribe link token. */
export const unsubscribe = form(v.object({ token: v.string() }), async ({ token }) => {
	const target = readUnsubscribeToken(token);
	if (!target) return { done: false };
	await setTopicEnabled(target.userId, target.topic, false);
	return { done: true };
});

async function staffId() {
	const session = await optionalEditorSession(getRequestEvent().cookies);
	if (!session || session.id < 1 || session.role === 'contributor')
		error(401, 'Sign in as an editor.');
	return session.id;
}

/** Whether the signed-in editor gets the daily review digest. */
export const getDigestEnabled = query(async () => isDigestEnabled(await staffId()));

/** Turns the daily review digest on or off for the signed-in editor. */
export const setDigestEnabled = command(v.boolean(), async (enabled) => {
	await setTopicEnabled(await staffId(), 'digest', enabled);
	getDigestEnabled().refresh();
});
