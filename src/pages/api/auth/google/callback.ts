import type { APIRoute } from "astro";
import { createSessionToken, setSessionCookie } from "@lib/admin/auth";
import { readSessionVersion } from "@lib/services/account-security";
import { clientIp } from "@lib/api/rate-limit";
import {
  clearOAuthTransactionCookie,
  exchangeGoogleCode,
  googleOAuthConfig,
  googleRedirectUri,
  readOAuthTransaction,
  verifyGoogleIdToken,
} from "@lib/auth/google-oauth";
import { linkOrCreateContributorFromGoogle } from "@lib/services/admin-user-service";
import { recordAudit } from "@lib/services/audit-log-service";

export const prerender = false;

/**
 * Google OAuth callback for sign-in (#456 follow-up). Google redirects here
 * with `code` + `state`; we verify the cookie-bound state, exchange the code
 * (PKCE), verify the ID token, link-or-create the contributor account, and
 * set the same `admin_session` cookie password login uses.
 */
export const GET: APIRoute = async ({ url, request, cookies }) => {
  const fail = (reason: string, clearCookie = false) =>
    new Response(null, {
      status: 303,
      headers: {
        Location: `/?auth_error=${encodeURIComponent(reason)}`,
        ...(clearCookie ? { "Set-Cookie": clearOAuthTransactionCookie() } : {}),
      },
    });

  const oauthError = url.searchParams.get("error");
  if (oauthError) return fail("oauth_failed", true);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code) return fail("missing_code");

  const config = googleOAuthConfig();
  if (!config) return fail("google_not_configured");

  const tx = readOAuthTransaction(cookies, "login", state);
  if (!tx) return fail("invalid_state", true);

  try {
    const tokens = await exchangeGoogleCode({
      config,
      code,
      codeVerifier: tx.codeVerifier,
      redirectUri: googleRedirectUri("login"),
    });
    if (!tokens.id_token) return fail("oauth_failed", true);

    const claims = await verifyGoogleIdToken(tokens.id_token, config.clientId);
    const user = await linkOrCreateContributorFromGoogle({
      sub: claims.sub,
      email: claims.email,
      emailVerified: claims.emailVerified,
      name: claims.name,
    });
    if (!user) return fail("account_unavailable", true);
    // Google's own sign-in (and its 2-Step Verification) stands in for ours,
    // so staff skip the TOTP step here (auth audit item 19).
    await recordAudit({
      action: "login.success",
      actor: user,
      targetUserId: user.id,
      targetLabel: user.username,
      detail: { method: "google" },
      ip: clientIp(request),
    });

    const token = createSessionToken({
      ...user,
      sessionVersion: await readSessionVersion(user.id),
    });
    const headers = new Headers({ Location: "/" });
    headers.append("Set-Cookie", setSessionCookie(token));
    headers.append("Set-Cookie", clearOAuthTransactionCookie());
    return new Response(null, { status: 303, headers });
  } catch (error) {
    console.error("Google OAuth callback failed:", error);
    return fail("oauth_failed", true);
  }
};
