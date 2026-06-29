import type { APIRoute } from "astro";
import {
  getAllClasses,
  getClassesForRoom,
  queryClasses,
} from "@lib/services/map-data-service";

export const prerender = false;

export const GET = (async ({ url }) => {
  const roomCode = url.searchParams.get("room_code");
  const termIdRaw = url.searchParams.get("term_id");
  const courseCode = url.searchParams.get("course_code");
  const limitRaw = url.searchParams.get("limit");
  const offsetRaw = url.searchParams.get("offset");
  const termId =
    termIdRaw !== null && termIdRaw !== "" ? Number(termIdRaw) : undefined;
  const limit =
    limitRaw !== null && limitRaw !== "" ? Number(limitRaw) : undefined;
  const offset =
    offsetRaw !== null && offsetRaw !== "" ? Number(offsetRaw) : undefined;
  const paginated =
    courseCode !== null ||
    (limitRaw !== null && limitRaw !== "") ||
    (offsetRaw !== null && offsetRaw !== "");

  if (roomCode) {
    const data = await getClassesForRoom(
      roomCode,
      Number.isFinite(termId) ? termId : undefined,
    );
    return new Response(JSON.stringify(data));
  }

  if (paginated) {
    const data = await queryClasses({
      termId: Number.isFinite(termId) ? termId : undefined,
      courseCodePrefix: courseCode ?? undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
      offset: Number.isFinite(offset) ? offset : undefined,
    });
    return new Response(JSON.stringify(data));
  }

  const data = await getAllClasses(
    Number.isFinite(termId) ? termId : undefined,
  );
  return new Response(JSON.stringify(data));
}) satisfies APIRoute;
