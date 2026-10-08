import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import { rateLimitResponse } from "@lib/api/rate-limit";
import { sharedRateLimit } from "@lib/api/rate-limit-db";
import { sendEmailVerification } from "@lib/services/admin-user-service";

export const prerender = false;

/** One link per account every two minutes, so the button cannot spam a mailbox. */
const LIMIT = { max: 1, windowMs: 2 * 60 * 1000 };

/** Account settings: send a fresh confirmation link to the unverified email. */
export const POST: APIRoute = async ({ cookies }) => {
  const auth = await editorSessionOrUnauthorized(cookies);
  if (auth instanceof Response) return auth;

  const rate = await sharedRateLimit(
    `account-resend-verification:${auth.session.id}`,
    LIMIT.max,
    LIMIT.windowMs,
  );
  if (!rate.allowed) {
    return rateLimitResponse(
      rate.resetAt,
      "A link was sent a moment ago. Check your inbox, or try again in two minutes.",
    );
  }

  const sent = await sendEmailVerification(auth.session.id);
  if (!sent) {
    return json(
      {
        error:
          "Could not send a confirmation link. Your email may already be confirmed, or mail is unavailable right now.",
      },
      409,
    );
  }
  return json({ success: true });
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
    },
  });
}
