import type { APIRoute } from "astro";
import {
  getActiveEvents,
  getAllEvents,
  getUpcomingEvents,
} from "../../lib/services/event-service";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const activeOnly = url.searchParams.get("active") === "1";
  const upcomingOnly = url.searchParams.get("upcoming") === "1";

  if (activeOnly) {
    return new Response(JSON.stringify(await getActiveEvents()), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (upcomingOnly) {
    return new Response(JSON.stringify(await getUpcomingEvents()), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(await getAllEvents()), {
    headers: { "Content-Type": "application/json" },
  });
};
