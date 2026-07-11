import {
  getBuildingCanonicalPath,
  getCollegeCanonicalPath,
  getDivisionCanonicalPath,
  getDormCanonicalPath,
  getEventCanonicalPath,
  getOrganizationCanonicalPath,
  getPlaceCanonicalPath,
  getRoomCanonicalPath,
} from "./entity-urls";
import { withTermQuery } from "./term-url";
import { absoluteUrl } from "./site";
import type { DormData, OrgData, PlaceData, RoomData } from "./types";

export function getBuildingShareUrl(
  buildingName: string,
  termId?: number | null,
  defaultTermId?: number | null,
) {
  return absoluteUrl(
    withTermQuery(
      getBuildingCanonicalPath(buildingName),
      termId,
      defaultTermId,
    ),
  );
}

export function getCollegeShareUrl(collegeName: string) {
  return absoluteUrl(getCollegeCanonicalPath(collegeName));
}

export function getDivisionShareUrl(divisionName: string) {
  return absoluteUrl(getDivisionCanonicalPath(divisionName));
}

export function getRoomShareUrl(
  room: Pick<RoomData, "id" | "code">,
  termId?: number | null,
  defaultTermId?: number | null,
) {
  return absoluteUrl(
    withTermQuery(getRoomCanonicalPath(room), termId, defaultTermId),
  );
}

export function getDormShareUrl(dorm: Pick<DormData, "id" | "dormName">) {
  return absoluteUrl(getDormCanonicalPath(dorm));
}

export function getOrganizationShareUrl(
  organization: Pick<OrgData, "id" | "name">,
) {
  return absoluteUrl(getOrganizationCanonicalPath(organization));
}

export function getPlaceShareUrl(
  place: Pick<PlaceData, "id" | "name" | "category">,
) {
  return absoluteUrl(getPlaceCanonicalPath(place));
}

export function getEventShareUrl(slug: string) {
  return absoluteUrl(getEventCanonicalPath(slug));
}
