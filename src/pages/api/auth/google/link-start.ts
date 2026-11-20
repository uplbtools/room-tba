import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import {
  buildGoogleAuthUrl,
  createOAuthTransaction,
  googleOAuthConfig,
  googleRedirectUri,
} from "@lib/auth/google-oauth";

export const prerender = false;

/**
 * Start Google OAuth to link an identity onto the *already logged-in*
 * account (Account settings → Connect Google), distinct from
 * `/api/auth/google/start` which creates/logs into a new account. The
 * callback is `/api/auth/google/link-callback`.
 */
export const GET: APIRoute = async ({ cookies }) => {
  const auth = await editorSessionOrUnauthorized(cookies);
  if (auth instanceof Response) return auth;

  const config = googleOAuthConfig();
  if (!config) {
    return new Response(null, {
      status: 303,
      headers: { Location: "/?account_error=google_not_configured" },
    });
  }

  const tx = createOAuthTransaction("link");
  const authUrl = buildGoogleAuthUrl({
    clientId: config.clientId,
    redirectUri: googleRedirectUri("link"),
    state: tx.state,
    codeChallenge: tx.codeChallenge,
  });
  return new Response(null, {
    status: 303,
    headers: { Location: authUrl, "Set-Cookie": tx.setCookie },
  });
};
