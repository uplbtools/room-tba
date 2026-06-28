import type { SearchCategory } from "./app-data";
import { slugifySegment } from "./site";
import { getDormRouteSlug, getRoomRouteSlug } from "./route-slugs";
import type {
  BuildingData,
  CollegeData,
  DivisionData,
  DormData,
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
  /^\/(building|college|division|room|dorm|event)\/([^/]+)\/?$/;

export function normalizePathname(pathname: string) {
  if (pathname === "/") return "/";
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : `${trimmed}/`;
}

export function parseEntityPathname(pathname: string): ParsedEntityPath | null {
  const match = pathname.match(ENTITY_PATH_PATTERN);
  if (!match) return null;
  return {
    category: match[1] as RoutableCategory,
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

export function getEventCanonicalPath(slug: string) {
  return `/event/${slug}/`;
}

export function getEntityCanonicalPath(
  query: Pick<RoutableQueryState, "type" | "category" | "value" | "eventSlug">,
  context: {
    room?: Pick<RoomData, "id" | "code"> | null;
    dorm?: Pick<DormData, "id" | "dormName"> | null;
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
