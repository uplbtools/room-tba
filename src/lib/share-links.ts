import {
  getBuildingCanonicalPath,
  getDormCanonicalPath,
  getEventCanonicalPath,
  getRoomCanonicalPath,
} from "./entity-urls";
import { absoluteUrl } from "./site";
import type { DormData, RoomData } from "./types";

export function getBuildingShareUrl(buildingName: string) {
  return absoluteUrl(getBuildingCanonicalPath(buildingName));
}

export function getRoomShareUrl(room: Pick<RoomData, "id" | "code">) {
  return absoluteUrl(getRoomCanonicalPath(room));
}

export function getDormShareUrl(dorm: Pick<DormData, "id" | "dormName">) {
  return absoluteUrl(getDormCanonicalPath(dorm));
}

export function getEventShareUrl(slug: string) {
  return absoluteUrl(getEventCanonicalPath(slug));
}
