import { APIRoute } from "astro";
import { getAllRooms } from "../../lib/services/map-data-service";

export const GET = (async (_) => {
  const data = await getAllRooms();
  return new Response(JSON.stringify(data));
}) satisfies APIRoute;
