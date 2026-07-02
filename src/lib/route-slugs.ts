import { slugifySegment } from "./site";
import type { DormData, RoomData } from "./types";

export function getRoomRouteSlug(room: Pick<RoomData, "id" | "code">) {
  return `${slugifySegment(room.code)}-${room.id}`;
}

export function getDormRouteSlug(dorm: Pick<DormData, "id" | "dormName">) {
  return `${slugifySegment(dorm.dormName)}-${dorm.id}`;
}

/** Parse numeric id suffix from room/dorm route slugs (`code-123` → 123). */
export function parseIdRouteSlug(slug: string): number | null {
  const match = slug.match(/-(\d+)$/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isInteger(id) && id > 0 ? id : null;
}
