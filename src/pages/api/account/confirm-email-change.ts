import type { APIRoute } from "astro";
import { confirmEmailChange } from "@lib/services/admin-user-service";

export const prerender = false;

/** Email-change confirmation link (#272 follow-up). No session required — the
 * signed token itself proves intent; the account it targets was already
 * verified when the change was requested. */
export const GET: APIRoute = async ({ url }) => {
  const token = url.searchParams.get("token");
  const fail = (reason: string) =>
    new Response(null, {
      status: 303,
      headers: { Location: `/?account_error=${encodeURIComponent(reason)}` },
    });

  if (!token) return fail("missing_token");

  try {
    await confirmEmailChange(token);
    return new Response(null, {
      status: 303,
      headers: { Location: "/?account=email-changed" },
    });
  } catch (error) {
    console.error("Confirm email change failed:", error);
    return fail("invalid_or_expired_token");
  }
};
