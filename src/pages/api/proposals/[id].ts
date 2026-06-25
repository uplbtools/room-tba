import type { APIRoute } from "astro";
import { getProposalById } from "../../../lib/services/proposal-service";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return json({ error: "Invalid proposal ID" }, 400);
  }

  const proposal = await getProposalById(id);
  if (!proposal) return json({ error: "Proposal not found" }, 404);

  return json({ proposal });
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
