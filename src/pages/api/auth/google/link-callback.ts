import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import {
  clearOAuthTransactionCookie,
  exchangeGoogleCode,
  googleOAuthConfig,
  googleRedirectUri,
  readOAuthTransaction,
  verifyGoogleIdToken,
} from "@lib/auth/google-oauth";
import {
  AccountActionError,
  googleIdentityUuid,
  linkGoogleIdentity,
} from "@lib/services/admin-user-service";

export const prerender = false;

/**
 * Google OAuth callback for linking Google to an *already logged-in* account
 * (Account settings → Connect Google), distinct from the login callback
 * (`/api/auth/google/callback`) which creates/logs-in a new account.
 */
export const GET: APIRoute = async ({ url, cookies }) => {
  const fail = (reason: string, clearCookie = false) =>
    new Response(null, {
      status: 303,
      headers: {
        Location: `/?account_error=${encodeURIComponent(reason)}`,
        ...(clearCookie ? { "Set-Cookie": clearOAuthTransactionCookie() } : {}),
      },
    });

  const auth = await editorSessionOrUnauthorized(cookies);
  if (auth instanceof Response) return fail("not_logged_in");

  if (url.searchParams.get("error")) return fail("oauth_failed", true);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code) return fail("missing_code");

  const config = googleOAuthConfig();
  if (!config) return fail("google_not_configured");

  const tx = readOAuthTransaction(cookies, "link", state);
  if (!tx) return fail("invalid_state", true);

  try {
    const tokens = await exchangeGoogleCode({
      config,
      code,
      codeVerifier: tx.codeVerifier,
      redirectUri: googleRedirectUri("link"),
    });
    if (!tokens.id_token) return fail("oauth_failed", true);

    const claims = await verifyGoogleIdToken(tokens.id_token, config.clientId);
    await linkGoogleIdentity(auth.session.id, googleIdentityUuid(claims.sub));
    return new Response(null, {
      status: 303,
      headers: {
        Location: "/?account=google-linked",
        "Set-Cookie": clearOAuthTransactionCookie(),
      },
    });
  } catch (error) {
    console.error("Google link callback failed:", error);
    const message =
      error instanceof AccountActionError ? "already_linked" : "oauth_failed";
    return fail(message, true);
  }
};
