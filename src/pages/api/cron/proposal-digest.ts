import type { APIRoute } from "astro";
import { cronAuthError, cronJson } from "@lib/api/cron-auth";
import { sendProposalDigest } from "@lib/services/digest-service";

export const prerender = false;

/** Daily editor digest of pending proposals (#272). Invoked by Vercel Cron. */
export const GET: APIRoute = async ({ request }) => {
  const denied = cronAuthError(request);
  if (denied) return denied;

  try {
    const result = await sendProposalDigest();
    return cronJson({ success: true, ...result });
  } catch (error) {
    console.error("Proposal digest run failed:", error);
    return cronJson({ error: "Digest run failed." }, 500);
  }
};
