import { APIRoute } from "astro";
import {
  getAllClasses,
  getClassesForRoom,
} from "../../lib/services/map-data-service";

export const prerender = false;

export const GET = (async ({ url }) => {
  const termParam = url.searchParams.get("term_id");
  const parsed = termParam !== null ? Number(termParam) : NaN;
  const termId = Number.isFinite(parsed) ? parsed : undefined;

  const roomCode = url.searchParams.get("room_code");

  const data = roomCode
    ? await getClassesForRoom(roomCode, termId)
    : await getAllClasses(termId);

  return new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json" },
  });
}) satisfies APIRoute;
