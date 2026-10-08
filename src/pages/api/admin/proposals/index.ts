import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import { parseReviewQueueQuery } from "@lib/proposals/review-queue-params";
import {
  countPendingProposals,
  listReviewQueue,
  PROPOSAL_ENTITY_TYPES,
} from "@lib/services/proposal-service";

export const prerender = false;

/**
 * Review queue page (auth audit item 17): filters `entityType`,
 * `submitter`, `olderThanDays`, `q`, keyset `cursor`, `limit`.
 * `pendingCount` is always the whole open queue, for the badge.
 */
export const GET: APIRoute = async ({ cookies, url }) => {
  const auth = await editorSessionOrUnauthorized(cookies, {
    requireReview: true,
  });
  if (auth instanceof Response) return auth;

  const query = parseReviewQueueQuery(url.searchParams, PROPOSAL_ENTITY_TYPES);
  const [page, pendingCount] = await Promise.all([
    listReviewQueue(query),
    countPendingProposals(),
  ]);

  return json({ ...page, pendingCount });
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
