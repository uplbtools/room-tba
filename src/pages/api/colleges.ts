import { APIRoute } from "astro";
import { getAllColleges } from "../../lib/services/map-data-service";

export const GET = (async (_) => {
  const data = await getAllColleges();
  return new Response(JSON.stringify(data));
}) satisfies APIRoute;
