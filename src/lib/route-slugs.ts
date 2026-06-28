import { slugifySegment } from "./site";
import type { DormData, RoomData } from "./types";

export function getRoomRouteSlug(room: Pick<RoomData, "id" | "code">) {
  return `${slugifySegment(room.code)}-${room.id}`;
}

export function getDormRouteSlug(dorm: Pick<DormData, "id" | "dormName">) {
  return `${slugifySegment(dorm.dormName)}-${dorm.id}`;
}
