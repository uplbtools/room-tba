import { PUBLIC_GOOGLE_CLIENT_ID } from "astro:env/client";

/** Check if Google OAuth is configured (client-side safe). */
export function isGoogleOAuthConfigured(): boolean {
  return Boolean(PUBLIC_GOOGLE_CLIENT_ID);
}
