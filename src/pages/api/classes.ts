import type { APIRoute } from "astro";
import {
  clampLimitParam,
  clampOffsetParam,
  paginationErrorResponse,
} from "@lib/api/pagination";
import {
  checkRateLimit,
  clientIp,
  rateLimitResponse,
} from "@lib/api/rate-limit";
import {
  getClassesForRoom,
  queryClasses,
} from "@lib/services/map-data-service";

export const prerender = false;

export const GET = (async ({ request, url }) => {
  const rateLimit = checkRateLimit(
    `read:classes:${clientIp(request)}`,
    300,
    60_000,
  );
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetAt);

  const roomCode = url.searchParams.get("room_code");
  const termIdRaw = url.searchParams.get("term_id");
  const courseCode = url.searchParams.get("course_code");
  const termId =
    termIdRaw !== null && termIdRaw !== "" ? Number(termIdRaw) : undefined;

  if (roomCode) {
    const data = await getClassesForRoom(
      roomCode,
      Number.isFinite(termId) ? termId : undefined,
    );
    return new Response(JSON.stringify(data));
  }

  const limit = clampLimitParam(url.searchParams.get("limit"), {
    defaultValue: 50,
    max: 100,
  });
  if (!limit.ok) return paginationErrorResponse(limit.error);

  const offset = clampOffsetParam(url.searchParams.get("offset"));
  if (!offset.ok) return paginationErrorResponse(offset.error);

  const data = await queryClasses({
    termId: Number.isFinite(termId) ? termId : undefined,
    courseCodePrefix: courseCode ?? undefined,
    limit: limit.value,
    offset: offset.value,
  });
  return new Response(JSON.stringify(data));
}) satisfies APIRoute;
