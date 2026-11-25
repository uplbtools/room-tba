import type { APIRoute } from "astro";
import {
  buildGoogleAuthUrl,
  createOAuthTransaction,
  googleOAuthConfig,
  googleRedirectUri,
} from "@lib/auth/google-oauth";

export const prerender = false;

/**
 * Start direct Google sign-in: 303 to Google's consent screen with a
 * cookie-bound `state` and PKCE `code_challenge`. The callback is
 * `/api/auth/google/callback` (replaces the Supabase OAuth start in
 * stores/index.svelte.ts `loginWithGoogle`).
 */
export const GET: APIRoute = async () => {
  const config = googleOAuthConfig();
  if (!config) {
    return new Response(null, {
      status: 303,
      headers: { Location: "/?auth_error=google_not_configured" },
    });
  }

  const tx = createOAuthTransaction("login");
  const authUrl = buildGoogleAuthUrl({
    clientId: config.clientId,
    redirectUri: googleRedirectUri("login"),
    state: tx.state,
    codeChallenge: tx.codeChallenge,
  });
  return new Response(null, {
    status: 303,
    headers: { Location: authUrl, "Set-Cookie": tx.setCookie },
  });
};
