import type { APIRoute } from "astro";
import { getEventBySlug } from "@lib/services/event-service";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug;
  if (!slug) {
    return new Response(JSON.stringify({ error: "Missing event slug" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const event = await getEventBySlug(slug);
  if (!event) {
    return new Response(JSON.stringify({ error: "Event not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(event), {
    headers: { "Content-Type": "application/json" },
  });
};
