import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import { linkGoogleIdentity } from "@lib/services/admin-user-service";
import { createServerSupabaseClient } from "@lib/supabase/server";

export const prerender = false;

/**
 * OAuth callback for linking Google to an *already logged-in* account
 * (Account settings → Connect Google), distinct from the login callback
 * (`/api/auth/callback`) which creates/logs-in a new account.
 */
export const GET: APIRoute = async ({ url, request, cookies }) => {
  const fail = (reason: string) =>
    new Response(null, {
      status: 303,
      headers: { Location: `/?account_error=${encodeURIComponent(reason)}` },
    });

  const auth = editorSessionOrUnauthorized(cookies);
  if (auth instanceof Response) return fail("not_logged_in");

  const code = url.searchParams.get("code");
  if (!code) return fail("missing_code");

  try {
    const supabase = createServerSupabaseClient({ request, cookies });
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) return fail("oauth_failed");

    await linkGoogleIdentity(auth.session.id, data.user.id);
    return new Response(null, {
      status: 303,
      headers: { Location: "/?account=google-linked" },
    });
  } catch (error) {
    console.error("Google link callback failed:", error);
    const message =
      error instanceof Error && error.name === "AccountActionError"
        ? "already_linked"
        : "oauth_failed";
    return fail(message);
  }
};
