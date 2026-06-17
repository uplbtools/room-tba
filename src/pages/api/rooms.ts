import { APIRoute } from "astro";
import { getAllRooms } from "../../lib/services/map-data-service";

export const GET = (async () => {
  const data = await getAllRooms();

  return new Response(JSON.stringify(data), {
    headers: [["Access-Control-Allow-Origin", "http://localhost:4321"]],
  });
}) satisfies APIRoute;
