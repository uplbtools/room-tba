import type { APIRoute } from "astro";
import { updateCollege } from "../../../../lib/services/admin-service";

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request }) => {
  const id = parseInt(params["id"] ?? "");
  if (isNaN(id)) {
    return new Response(JSON.stringify({ error: "Invalid college ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { collegeName?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.collegeName || body.collegeName.trim().length === 0) {
    return new Response(JSON.stringify({ error: "College name is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await updateCollege(id, body.collegeName.trim());
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Failed to update college:", err);
    return new Response(JSON.stringify({ error: "Failed to save college" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
