import { getDormRouteSlug, getRoomRouteSlug } from "./route-slugs";
import { absoluteUrl, slugifySegment } from "./site";
import type { DormData, RoomData } from "./types";

export function getBuildingShareUrl(buildingName: string) {
  return absoluteUrl(`/building/${slugifySegment(buildingName)}/`);
}

export function getRoomShareUrl(room: Pick<RoomData, "id" | "code">) {
  return absoluteUrl(`/room/${getRoomRouteSlug(room)}/`);
}

export function getDormShareUrl(dorm: Pick<DormData, "id" | "dormName">) {
  return absoluteUrl(`/dorm/${getDormRouteSlug(dorm)}/`);
}

export function getEventShareUrl(slug: string) {
  return absoluteUrl(`/event/${slug}/`);
}
