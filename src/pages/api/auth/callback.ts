import type { APIRoute } from "astro";
import { createSessionToken, setSessionCookie } from "@lib/admin/auth";
import { linkOrCreateContributorFromSupabase } from "@lib/services/admin-user-service";
import { createServerSupabaseClient } from "@lib/supabase/server";

export const prerender = false;

/**
 * OAuth callback (#456). Supabase redirects here with a `code` after
 * Google sign-in; we exchange it, link or create the contributor account,
 * and set the same `admin_session` cookie password login uses.
 */
export const GET: APIRoute = async ({ url, request, cookies }) => {
  const fail = (reason: string) =>
    new Response(null, {
      status: 303,
      headers: { Location: `/?auth_error=${encodeURIComponent(reason)}` },
    });

  const code = url.searchParams.get("code");
  if (!code) return fail("missing_code");

  try {
    const supabase = createServerSupabaseClient({ request, cookies });
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) return fail("oauth_failed");

    const meta = data.user.user_metadata as
      | { full_name?: string; name?: string }
      | undefined;
    const user = await linkOrCreateContributorFromSupabase({
      id: data.user.id,
      email: data.user.email ?? null,
      name: meta?.full_name ?? meta?.name ?? null,
    });
    if (!user) return fail("account_unavailable");

    const token = createSessionToken(user);
    return new Response(null, {
      status: 303,
      headers: {
        Location: "/",
        "Set-Cookie": setSessionCookie(token),
      },
    });
  } catch (error) {
    console.error("OAuth callback failed:", error);
    return fail("oauth_failed");
  }
};
