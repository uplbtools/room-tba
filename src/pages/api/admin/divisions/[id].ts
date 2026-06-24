import type { APIRoute } from "astro";
import { updateDivision } from "../../../../lib/services/admin-service";

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request }) => {
  const id = parseInt(params["id"] ?? "");
  if (isNaN(id)) {
    return new Response(JSON.stringify({ error: "Invalid division ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { divisionName?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.divisionName || body.divisionName.trim().length === 0) {
    return new Response(JSON.stringify({ error: "Division name is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await updateDivision(id, body.divisionName.trim());
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Failed to update division:", err);
    return new Response(JSON.stringify({ error: "Failed to save division" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
