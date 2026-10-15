import { editorSessionOrUnauthorized } from '#lib/admin/require-editor.js';
import { linkGoogleIdentity } from '#lib/services/admin/user.js';
import { createServerSupabaseClient } from '#lib/supabase/server.js';
import type { RequestHandler } from './$types';

/**
 * OAuth callback for linking Google to an *already logged-in* account
 * (Account settings → Connect Google), distinct from the login callback
 * (`/api/auth/callback`) which creates/logs-in a new account.
 */
export const GET: RequestHandler = async ({ url, request, cookies }) => {
	const fail = (reason: string) =>
		new Response(null, {
			status: 303,
			headers: { Location: `/?account_error=${encodeURIComponent(reason)}` }
		});

	const auth = await editorSessionOrUnauthorized(cookies);
	if (auth instanceof Response) return fail('not_logged_in');

	const code = url.searchParams.get('code');
	if (!code) return fail('missing_code');

	try {
		const supabase = createServerSupabaseClient({ request, cookies });
		const { data, error } = await supabase.auth.exchangeCodeForSession(code);
		if (error || !data.user) return fail('oauth_failed');

		await linkGoogleIdentity(auth.session.id, data.user.id);
		return new Response(null, {
			status: 303,
			headers: { Location: '/?account=google-linked' }
		});
	} catch (error) {
		console.error('Google link callback failed:', error);
		const message =
			error instanceof Error && error.name === 'AccountActionError'
				? 'already_linked'
				: 'oauth_failed';
		return fail(message);
	}
};
