import type { APIRoute } from "astro";
import { timingSafeEqual } from "node:crypto";
import { CRON_SECRET } from "astro:env/server";
import { sendProposalDigest } from "@lib/services/digest-service";
import { pruneExpiredRateLimits } from "@lib/api/rate-limit-db";
import { cleanupQuarantinedUploads } from "@lib/services/upload-quarantine-service";

export const prerender = false;

/** Daily editor digest of pending proposals (#272). Invoked by Vercel Cron.
 * Also runs the daily housekeeping (stale quarantine uploads, expired rate
 * limit rows) so it needs no extra cron slot; each step fails on its own. */
export const GET: APIRoute = async ({ request }) => {
  if (!CRON_SECRET) {
    return json({ error: "Cron is not configured on this server." }, 503);
  }
  const authHeader = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${CRON_SECRET}`;
  const authBuf = Buffer.from(authHeader);
  const expectedBuf = Buffer.from(expected);
  if (
    authBuf.length !== expectedBuf.length ||
    !timingSafeEqual(authBuf, expectedBuf)
  ) {
    return json({ error: "Unauthorized" }, 401);
  }

  const housekeeping = await runHousekeeping();
  try {
    const result = await sendProposalDigest();
    return json({ success: true, ...result, housekeeping });
  } catch (error) {
    console.error("Proposal digest run failed:", error);
    return json({ error: "Digest run failed.", housekeeping }, 500);
  }
};

async function runHousekeeping() {
  const out: {
    quarantine: Awaited<ReturnType<typeof cleanupQuarantinedUploads>> | null;
    rateLimitRowsPruned: number | null;
  } = { quarantine: null, rateLimitRowsPruned: null };
  try {
    out.quarantine = await cleanupQuarantinedUploads();
  } catch (error) {
    console.error("Quarantine cleanup failed:", error);
  }
  try {
    out.rateLimitRowsPruned = await pruneExpiredRateLimits();
  } catch (error) {
    console.error("Rate limit prune failed:", error);
  }
  return out;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
