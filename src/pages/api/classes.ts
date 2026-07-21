import type { APIRoute } from "astro";
import {
  getAllClasses,
  getClassesForRoom,
} from "@lib/services/map-data-service";

export const prerender = false;

export const GET = (async ({ url }) => {
  const roomCode = url.searchParams.get("room_code");
  const termIdRaw = url.searchParams.get("term_id");
  const termId =
    termIdRaw !== null && termIdRaw !== "" ? Number(termIdRaw) : undefined;

  if (roomCode) {
    const data = await getClassesForRoom(
      roomCode,
      Number.isFinite(termId) ? termId : undefined,
    );
    return new Response(JSON.stringify(data));
  }

  const data = await getAllClasses(
    Number.isFinite(termId) ? termId : undefined,
  );
  return new Response(JSON.stringify(data));
}) satisfies APIRoute;
