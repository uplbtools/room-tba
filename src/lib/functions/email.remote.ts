import { form } from '$app/server';
import * as v from 'valibot';
import { readUnsubscribeToken, unsubscribeFromTopic } from '#lib/services/email/unsubscribe.js';

export const unsubscribe = form(v.object({ token: v.string() }), async ({ token }) => {
	const target = readUnsubscribeToken(token);
	if (!target) return { done: false };
	await unsubscribeFromTopic(target.userId, target.topic);
	return { done: true };
});
