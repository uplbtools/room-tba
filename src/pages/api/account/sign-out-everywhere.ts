import type { APIRoute } from "astro";
import { clearSessionCookie } from "@lib/admin/auth";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import { signOutEverywhere } from "@lib/services/admin-user-service";

export const prerender = false;

/**
 * Account settings → "Sign out of all devices". Bumps the account's session
 * version, so every cookie issued before (this device's included) fails
 * revalidation on its next request, then clears this device's cookie.
 */
export const POST: APIRoute = async ({ cookies }) => {
  const auth = await editorSessionOrUnauthorized(cookies);
  if (auth instanceof Response) return auth;

  try {
    await signOutEverywhere(auth.session.id);
  } catch (error) {
    console.error("Sign out everywhere failed:", error);
    return new Response(
      JSON.stringify({ error: "Could not sign out other devices. Try again." }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, no-store",
        },
      },
    );
  }
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
      "Set-Cookie": clearSessionCookie(),
    },
  });
};
