import type { APIRoute } from "astro";
import { cronAuthError, cronJson } from "@lib/api/cron-auth";
import { sendProposalDigest } from "@lib/services/digest-service";
import { pruneExpiredRateLimits } from "@lib/api/rate-limit-db";
import { cleanupQuarantinedUploads } from "@lib/services/upload-quarantine-service";

export const prerender = false;

/** Daily editor digest of pending proposals (#272). Invoked by Vercel Cron.
 * Also runs the daily housekeeping (stale quarantine uploads, expired rate
 * limit rows) so it needs no extra cron slot; each step fails on its own. */
export const GET: APIRoute = async ({ request }) => {
  const denied = cronAuthError(request);
  if (denied) return denied;

  const housekeeping = await runHousekeeping();
  try {
    const result = await sendProposalDigest();
    return cronJson({ success: true, ...result, housekeeping });
  } catch (error) {
    console.error("Proposal digest run failed:", error);
    return cronJson({ error: "Digest run failed.", housekeeping }, 500);
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
