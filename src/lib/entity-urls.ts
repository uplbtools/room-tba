import type { SearchCategory } from "./app-data";
import { isLandmarkPlaceCategory } from "@constants/place-categories";
import { isStudentOrganization } from "@constants/org-categories";
import { slugifySegment } from "./site";
import {
  getDormRouteSlug,
  getOrganizationRouteSlug,
  getPlaceRouteSlug,
  getRoomRouteSlug,
} from "./route-slugs";
import type {
  BuildingData,
  CollegeData,
  DivisionData,
  DormData,
  OrgData,
  PlaceData,
  RoomData,
} from "./types";

function getBuildingSlug(building: Pick<BuildingData, "buildingName">) {
  return slugifySegment(building.buildingName);
}

function getCollegeSlug(college: Pick<CollegeData, "collegeName">) {
  return slugifySegment(college.collegeName);
}

function getDivisionSlug(division: Pick<DivisionData, "divisionName">) {
  return slugifySegment(division.divisionName);
}

export type RoutableCategory = SearchCategory;

export type RoutableQueryState = {
  type: "query" | "result";
  category:
    | "building"
    | "division"
    | "college"
    | "room"
    | "class"
    | "dorm"
    | "organization"
    | "place"
    | "event"
    | "events"
    | null;
  value: string;
  eventSlug?: string;
};

export type ParsedEntityPath = {
  category: RoutableCategory;
  slug: string;
};

const ENTITY_PATH_PATTERN =
  /^\/(building|college|division|room|dorm|organization|unit|landmark|establishment|event)\/([^/]+)\/?$/;

export function normalizePathname(pathname: string) {
  if (pathname === "/") return "/";
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : `${trimmed}/`;
}

export function parseEntityPathname(pathname: string): ParsedEntityPath | null {
  const match = pathname.match(ENTITY_PATH_PATTERN);
  if (!match) return null;
  return {
    category:
      match[1] === "landmark" || match[1] === "establishment"
        ? "place"
        : match[1] === "unit"
          ? "organization"
          : (match[1] as RoutableCategory),
    slug: decodeURIComponent(match[2]),
  };
}

export function parseRouteSlug(slug: string) {
  const match = slug.match(/^(.+)-(\d+)$/);
  if (!match) {
    return { nameSlug: slug, id: null as number | null };
  }
  return { nameSlug: match[1], id: Number(match[2]) };
}

export function getBuildingCanonicalPath(buildingName: string) {
  return `/building/${getBuildingSlug({ buildingName })}/`;
}

export function getCollegeCanonicalPath(collegeName: string) {
  return `/college/${getCollegeSlug({ collegeName })}/`;
}

export function getDivisionCanonicalPath(divisionName: string) {
  return `/division/${getDivisionSlug({ divisionName })}/`;
}

export function getRoomCanonicalPath(room: Pick<RoomData, "id" | "code">) {
  return `/room/${getRoomRouteSlug(room)}/`;
}

export function getDormCanonicalPath(dorm: Pick<DormData, "id" | "dormName">) {
  return `/dorm/${getDormRouteSlug(dorm)}/`;
}

export function getOrganizationCanonicalPath(
  organization: Pick<OrgData, "id" | "name"> &
    Partial<Pick<OrgData, "category">>,
) {
  // Student community entities live under /organization/; offices and academic
  // units get /unit/ so their links aren't mislabeled. Old /organization/ links
  // for units keep resolving via parseEntityPathname.
  const section =
    organization.category && !isStudentOrganization(organization.category)
      ? "unit"
      : "organization";
  return `/${section}/${getOrganizationRouteSlug(organization)}/`;
}

export function getPlaceCanonicalPath(
  place: Pick<PlaceData, "id" | "name" | "category">,
) {
  const section = isLandmarkPlaceCategory(place.category)
    ? "landmark"
    : "establishment";
  return `/${section}/${getPlaceRouteSlug(place)}/`;
}

export function getEventCanonicalPath(slug: string) {
  return `/event/${slug}/`;
}

export function getEntityCanonicalPath(
  query: Pick<RoutableQueryState, "type" | "category" | "value" | "eventSlug">,
  context: {
    room?: Pick<RoomData, "id" | "code"> | null;
    dorm?: Pick<DormData, "id" | "dormName"> | null;
    organization?: Pick<OrgData, "id" | "name"> | null;
    place?: Pick<PlaceData, "id" | "name" | "category"> | null;
  } = {},
): string | null {
  if (query.type !== "result" || query.category === null) return null;

  switch (query.category) {
    case "building":
      return getBuildingCanonicalPath(query.value);
    case "college":
      return getCollegeCanonicalPath(query.value);
    case "division":
      return getDivisionCanonicalPath(query.value);
    case "room":
      return context.room ? getRoomCanonicalPath(context.room) : null;
    case "dorm":
      return context.dorm ? getDormCanonicalPath(context.dorm) : null;
    case "organization":
      return context.organization
        ? getOrganizationCanonicalPath(context.organization)
        : null;
    case "place":
      return context.place ? getPlaceCanonicalPath(context.place) : null;
    case "event":
      return query.eventSlug ? getEventCanonicalPath(query.eventSlug) : null;
    case "class":
    case "events":
      return null;
    default:
      return null;
  }
}

export function resolveQueryFromEntityPath(
  parsed: ParsedEntityPath,
  context: {
    buildings?: BuildingData[] | null;
    colleges?: CollegeData[] | null;
    divisions?: DivisionData[] | null;
    dorms?: DormData[] | null;
    organizations?: OrgData[] | null;
    places?: PlaceData[] | null;
  },
): RoutableQueryState | null {
  const { category, slug } = parsed;

  switch (category) {
    case "building": {
      const building = context.buildings?.find(
        (entry) => getBuildingSlug(entry) === slug,
      );
      if (!building) return null;
      return {
        type: "result",
        category: "building",
        value: building.buildingName,
      };
    }
    case "college": {
      const college = context.colleges?.find(
        (entry) => getCollegeSlug(entry) === slug,
      );
      if (!college) return null;
      return {
        type: "result",
        category: "college",
        value: college.collegeName,
      };
    }
    case "division": {
      const division = context.divisions?.find(
        (entry) => getDivisionSlug(entry) === slug,
      );
      if (!division) return null;
      return {
        type: "result",
        category: "division",
        value: division.divisionName,
      };
    }
    case "dorm": {
      const { id } = parseRouteSlug(slug);
      const dorm =
        id === null
          ? context.dorms?.find((entry) => getDormRouteSlug(entry) === slug)
          : context.dorms?.find((entry) => entry.id === id);
      if (!dorm) return null;
      return { type: "result", category: "dorm", value: dorm.dormName };
    }
    case "room":
      return null;
    case "organization": {
      const { id } = parseRouteSlug(slug);
      const organization =
        id === null
          ? context.organizations?.find(
              (entry) => getOrganizationRouteSlug(entry) === slug,
            )
          : context.organizations?.find((entry) => entry.id === id);
      if (!organization) return null;
      return {
        type: "result",
        category: "organization",
        value: organization.name,
      };
    }
    case "place": {
      const { id } = parseRouteSlug(slug);
      const place =
        id === null
          ? context.places?.find((entry) => getPlaceRouteSlug(entry) === slug)
          : context.places?.find((entry) => entry.id === id);
      if (!place) return null;
      return { type: "result", category: "place", value: place.name };
    }
    case "event":
      return {
        type: "result",
        category: "event",
        value: slug,
        eventSlug: slug,
      };
    default:
      return null;
  }
}
