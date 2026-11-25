import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
} from "astro:env/server";
import { absoluteUrl } from "@lib/site";
import type { AstroCookies } from "astro";

/**
 * Direct Google OAuth (replaces Supabase Auth for Google sign-in, #456
 * follow-up). The browser never sees the client secret; the state + PKCE
 * verifier ride in a short-lived HttpOnly cookie bound to this browser.
 */

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";
const OAUTH_SCOPE = "openid email profile";

const STATE_COOKIE = "google_oauth";
const STATE_COOKIE_MAX_AGE = 60 * 10; // 10 minutes

export type GoogleOAuthFlow = "login" | "link";

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
};

export function googleOAuthConfig(): GoogleOAuthConfig | null {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return null;
  return { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET };
}

function callbackPath(flow: GoogleOAuthFlow): string {
  return flow === "link"
    ? "/api/auth/google/link-callback"
    : "/api/auth/google/callback";
}

/**
 * Exact redirect_uri registered in Google Cloud Console. GOOGLE_REDIRECT_URI
 * overrides the login callback only; the link flow derives its own URI from
 * the same origin so staging/preview deploys stay self-consistent.
 */
export function googleRedirectUri(flow: GoogleOAuthFlow): string {
  const path = callbackPath(flow);
  if (GOOGLE_REDIRECT_URI) {
    try {
      const url = new URL(GOOGLE_REDIRECT_URI);
      url.pathname = path;
      return url.toString();
    } catch {
      // fall through to the default
    }
  }
  return absoluteUrl(path);
}

export function buildGoogleAuthUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const params = new URLSearchParams({
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: OAUTH_SCOPE,
    state: opts.state,
    code_challenge: opts.codeChallenge,
    code_challenge_method: "S256",
    // Always show the account picker: silent re-auth would skip the consent
    // screen that proves which Google account is being linked.
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export type OAuthTransaction = {
  state: string;
  /** PKCE S256 challenge derived from the verifier (verifier stays in cookie). */
  codeChallenge: string;
  /** Set-Cookie header value binding state+verifier to this browser. */
  setCookie: string;
};

export function createOAuthTransaction(
  flow: GoogleOAuthFlow,
): OAuthTransaction {
  const state = randomBytes(32).toString("base64url");
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  const payload = Buffer.from(
    JSON.stringify({ s: state, v: codeVerifier, f: flow }),
  ).toString("base64url");
  const setCookie = `${STATE_COOKIE}=${payload}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${STATE_COOKIE_MAX_AGE}`;
  return { state, codeChallenge, setCookie };
}

const CLEARED_STATE_COOKIE = `${STATE_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
export function clearOAuthTransactionCookie(): string {
  return CLEARED_STATE_COOKIE;
}

/**
 * Read and validate the transaction cookie for `flow`. Returns the PKCE
 * verifier when the callback's `state` param matches; null otherwise
 * (missing cookie, wrong flow, or state mismatch — all look identical to
 * the caller, which is correct: they are all CSRF failures).
 */
export function readOAuthTransaction(
  cookies: AstroCookies,
  flow: GoogleOAuthFlow,
  stateParam: string | null,
): { state: string; codeVerifier: string } | null {
  const raw = cookies.get(STATE_COOKIE)?.value;
  if (!raw || !stateParam) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    ) as { s?: string; v?: string; f?: string };
    if (
      payload.f !== flow ||
      typeof payload.s !== "string" ||
      typeof payload.v !== "string"
    ) {
      return null;
    }
    const a = Buffer.from(payload.s);
    const b = Buffer.from(stateParam);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return { state: payload.s, codeVerifier: payload.v };
  } catch {
    return null;
  }
}

export type GoogleTokenResponse = {
  id_token?: string;
  access_token?: string;
};

/** Exchange the authorization `code` (+ PKCE verifier) for tokens. */
export async function exchangeGoogleCode(opts: {
  config: GoogleOAuthConfig;
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    client_id: opts.config.clientId,
    client_secret: opts.config.clientSecret,
    code: opts.code,
    grant_type: "authorization_code",
    redirect_uri: opts.redirectUri,
    code_verifier: opts.codeVerifier,
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${res.status}`);
  }
  return (await res.json()) as GoogleTokenResponse;
}

export type GoogleIdentityClaims = {
  /** Stable per-Google-account subject id. */
  sub: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
};

/**
 * Verify the ID token through Google's tokeninfo endpoint, which checks the
 * signature, issuer and expiry server-side; we re-check audience/expiry
 * client-side so a token minted for another client can't slip through.
 */
export async function verifyGoogleIdToken(
  idToken: string,
  clientId: string,
): Promise<GoogleIdentityClaims> {
  const res = await fetch(
    `${GOOGLE_TOKENINFO_URL}?id_token=${encodeURIComponent(idToken)}`,
    { signal: AbortSignal.timeout(10_000) },
  );
  if (!res.ok) throw new Error(`Google tokeninfo failed: ${res.status}`);
  const claims = (await res.json()) as Record<string, unknown>;

  const aud = claims["aud"];
  const iss = claims["iss"];
  const exp = Number(claims["exp"]);
  const sub = claims["sub"];
  if (
    aud !== clientId ||
    (iss !== "accounts.google.com" && iss !== "https://accounts.google.com") ||
    !Number.isFinite(exp) ||
    exp <= Math.floor(Date.now() / 1000) ||
    typeof sub !== "string" ||
    !sub
  ) {
    throw new Error("Google ID token claims invalid");
  }

  const email = typeof claims["email"] === "string" ? claims["email"] : null;
  const emailVerified =
    claims["email_verified"] === true || claims["email_verified"] === "true";
  const name = typeof claims["name"] === "string" ? claims["name"] : null;
  return { sub, email, emailVerified, name };
}
