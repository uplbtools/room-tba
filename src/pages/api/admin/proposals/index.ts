import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import {
  countPendingProposals,
  listPendingProposals,
} from "@lib/services/proposal-service";

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const auth = editorSessionOrUnauthorized(cookies, { requireReview: true });
  if (auth instanceof Response) return auth;

  const [proposals, pendingCount] = await Promise.all([
    listPendingProposals(),
    countPendingProposals(),
  ]);

  return json({ proposals, pendingCount });
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
