import type { APIRoute } from "astro";
import { decodeClassCursor } from "@lib/api/class-cursor";
import { cachedJson } from "@lib/api/json";
import { clampLimitParam, paginationErrorResponse } from "@lib/api/pagination";
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
    return cachedJson(data);
  }

  if (url.searchParams.has("offset")) {
    return paginationErrorResponse(
      "offset is no longer supported; page with cursor instead (#412)",
    );
  }

  const limit = clampLimitParam(url.searchParams.get("limit"), {
    defaultValue: 25,
    max: 100,
  });
  if (!limit.ok) return paginationErrorResponse(limit.error);

  const cursorRaw = url.searchParams.get("cursor");
  const cursor = cursorRaw ? decodeClassCursor(cursorRaw) : undefined;
  if (cursorRaw && !cursor) {
    return paginationErrorResponse("cursor is not a valid pagination token");
  }

  const data = await queryClasses({
    termId: Number.isFinite(termId) ? termId : undefined,
    courseCodePrefix: courseCode ?? undefined,
    limit: limit.value,
    cursor: cursor ?? undefined,
  });
  return cachedJson(data);
}) satisfies APIRoute;
