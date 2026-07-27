import { buildingsTable, dormsTable, placesTable } from "@drizzle/schema";
import { db } from "@lib/db";
import { slugifySegment } from "@lib/site";
import type { RoutePlace } from "@lib/campus-route";

export type RoutableKind = "building" | "dorm" | "place";

export type RoutablePlace = RoutePlace & {
  kind: RoutableKind;
  slug: string;
};

/**
 * Everything on campus with a name and a position: the set you can route
 * between, and the set used to label turns. One pass over three small tables,
 * cached by the page's ISR entry rather than in memory, since a fresh edit to
 * a pin should show up on the next revalidation.
 */
export async function getRoutablePlaces(): Promise<RoutablePlace[]> {
  const [buildings, dorms, places] = await Promise.all([
    db
      .select({
        name: buildingsTable.buildingName,
        lat: buildingsTable.lat,
        lon: buildingsTable.lon,
      })
      .from(buildingsTable),
    db
      .select({
        name: dormsTable.dormName,
        lat: dormsTable.lat,
        lon: dormsTable.lon,
      })
      .from(dormsTable),
    db
      .select({
        name: placesTable.name,
        lat: placesTable.lat,
        lon: placesTable.lon,
      })
      .from(placesTable),
  ]);

  const rows: {
    name: string;
    lat: number | null;
    lon: number | null;
    kind: RoutableKind;
  }[] = [
    ...buildings.map((row) => ({ ...row, kind: "building" as const })),
    ...dorms.map((row) => ({ ...row, kind: "dorm" as const })),
    ...places.map((row) => ({ ...row, kind: "place" as const })),
  ];

  const seen = new Set<string>();
  const routable: RoutablePlace[] = [];
  for (const row of rows) {
    // Dorms and places carry nullable coordinates, and an unplaced pin would
    // route from the middle of the ocean.
    if (row.lat === null || row.lon === null || !row.name) continue;
    const slug = slugifySegment(row.name);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    routable.push({
      name: row.name,
      lat: row.lat,
      lon: row.lon,
      kind: row.kind,
      slug,
    });
  }
  return routable;
}

export function findBySlug(
  places: RoutablePlace[],
  slug: string,
): RoutablePlace | null {
  return places.find((place) => place.slug === slug) ?? null;
}
