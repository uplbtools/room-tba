import type { Handle } from '@sveltejs/kit/hooks';
import type { RequestEvent } from '@sveltejs/kit';
import { isSupabaseConfigured } from './env';
import { createServerSupabaseClient } from './server';

/** Refresh the Supabase session and attach the client to `event.locals`. */
export async function refreshSupabaseSession(event: RequestEvent): Promise<void> {
	if (!isSupabaseConfigured()) return;

	const pendingCacheHeaders: Record<string, string> = {};
	try {
		const supabase = createServerSupabaseClient({
			request: event.request,
			cookies: event.cookies,
			applyCacheHeaders: (headers) => {
				Object.assign(pendingCacheHeaders, headers);
			}
		});

		const {
			data: { user }
		} = await supabase.auth.getUser();

		event.locals.supabase = supabase;
		event.locals.supabaseUser = user ?? undefined;
		event.locals.supabaseCacheHeaders = pendingCacheHeaders;
	} catch (error) {
		console.error('Supabase session refresh failed:', error);
	}
}

export function applySupabaseCacheHeaders(response: Response, event: RequestEvent): Response {
	const cacheHeaders = event.locals.supabaseCacheHeaders;
	if (!cacheHeaders) return response;

	for (const [key, value] of Object.entries(cacheHeaders)) {
		response.headers.set(key, value);
	}
	return response;
}

export const supabaseHandle: Handle = async ({ event, resolve }) => {
	await refreshSupabaseSession(event);
	const response = await resolve(event);
	return applySupabaseCacheHeaders(response, event);
};
