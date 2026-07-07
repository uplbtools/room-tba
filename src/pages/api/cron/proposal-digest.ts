import type { APIRoute } from "astro";
import { CRON_SECRET } from "astro:env/server";
import { sendProposalDigest } from "@lib/services/digest-service";

export const prerender = false;

/** Daily editor digest of pending proposals (#272). Invoked by Vercel Cron. */
export const GET: APIRoute = async ({ request }) => {
  if (!CRON_SECRET) {
    return json({ error: "Cron is not configured on this server." }, 503);
  }
  if (request.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const result = await sendProposalDigest();
    return json({ success: true, ...result });
  } catch (error) {
    console.error("Proposal digest run failed:", error);
    return json({ error: "Digest run failed." }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
