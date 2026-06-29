import type { APIRoute } from "astro";
import { queryFinalExams } from "@lib/services/map-data-service";

export const prerender = false;

export const GET = (async ({ url }) => {
  const courseCode = url.searchParams.get("course_code") ?? undefined;
  const roomCode = url.searchParams.get("room_code") ?? undefined;
  const date = url.searchParams.get("date") ?? undefined;
  const termIdRaw = url.searchParams.get("term_id");
  const termId =
    termIdRaw !== null && termIdRaw !== "" ? Number(termIdRaw) : undefined;

  const data = await queryFinalExams({
    courseCode,
    roomCode,
    date,
    termId: Number.isFinite(termId) ? termId : undefined,
  });
  return new Response(JSON.stringify(data));
}) satisfies APIRoute;
