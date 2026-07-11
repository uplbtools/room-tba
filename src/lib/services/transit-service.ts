import { and, asc, eq, max, sql } from "drizzle-orm";
import { jeepneyRoutesTable, jeepneyStopsTable } from "@drizzle/schema";
import { db } from "@lib/db";
import type { JeepneyRoute, JeepneyStop } from "@constants/jeepney-routes";
import { refreshSyncKey, recordEditorHistory } from "./admin-service";
import { EditConflictError } from "./edit-conflict-error";

export type JeepneyStopWriteInput = Partial<{
  name: string;
  description: string;
  lat: number;
  lon: number;
  sortOrder: number;
  isActive: boolean;
}>;

export type JeepneyStopCreateInput = Required<
  Pick<JeepneyStopWriteInput, "name" | "description" | "lat" | "lon">
> & {
  routeId: string;
};

export async function getAllJeepneyRoutes(): Promise<JeepneyRoute[]> {
  const [routes, stops] = await Promise.all([
    db
      .select()
      .from(jeepneyRoutesTable)
      .where(eq(jeepneyRoutesTable.isActive, true))
      .orderBy(jeepneyRoutesTable.name),
    db
      .select()
      .from(jeepneyStopsTable)
      .where(eq(jeepneyStopsTable.isActive, true))
      .orderBy(
        asc(jeepneyStopsTable.routeId),
        asc(jeepneyStopsTable.sortOrder),
      ),
  ]);

  return routes.map((route) => ({
    id: route.id,
    name: route.name,
    description: route.description,
    directionNote: route.directionNote ?? undefined,
    color: route.color,
    fare: {
      regular: route.fareRegular,
      discounted: route.fareDiscounted,
    },
    stops: stops
      .filter((stop) => stop.routeId === route.id)
      .map(
        (stop): JeepneyStop => ({
          id: stop.id,
          name: stop.name,
          description: stop.description,
          lat: stop.lat,
          lon: stop.lon,
          sortOrder: stop.sortOrder,
          version: stop.version,
          updatedAt: stop.updatedAt,
        }),
      ),
  }));
}

export async function getJeepneyStopById(id: number) {
  const [stop] = await db
    .select()
    .from(jeepneyStopsTable)
    .where(eq(jeepneyStopsTable.id, id))
    .limit(1);
  return stop ?? null;
}

export async function createJeepneyStop(
  input: JeepneyStopCreateInput,
  editedBy = "admin",
) {
  const [route] = await db
    .select({ id: jeepneyRoutesTable.id })
    .from(jeepneyRoutesTable)
    .where(
      and(
        eq(jeepneyRoutesTable.id, input.routeId),
        eq(jeepneyRoutesTable.isActive, true),
      ),
    )
    .limit(1);
  if (!route) return null;

  const [last] = await db
    .select({ sortOrder: max(jeepneyStopsTable.sortOrder) })
    .from(jeepneyStopsTable)
    .where(eq(jeepneyStopsTable.routeId, input.routeId));
  const [created] = await db
    .insert(jeepneyStopsTable)
    .values({
      routeId: input.routeId,
      name: input.name.trim(),
      description: input.description.trim(),
      lat: input.lat,
      lon: input.lon,
      sortOrder: Number(last?.sortOrder ?? 0) + 1,
    })
    .returning();
  if (!created) return null;

  await recordEditorHistory({
    entityType: "jeepney_stop",
    entityId: created.id,
    action: "create",
    before: null,
    after: created,
    versionBefore: null,
    versionAfter: created.version,
    editedBy,
  });
  await refreshSyncKey("jeepney_routes");
  return created;
}

export async function updateJeepneyStop(
  id: number,
  input: JeepneyStopWriteInput,
  expectedVersion?: number,
  editedBy = "admin",
) {
  const updates = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
  const before = await getJeepneyStopById(id);
  if (!before) return null;
  if (Object.keys(updates).length === 0) return before;

  const where =
    expectedVersion === undefined
      ? eq(jeepneyStopsTable.id, id)
      : and(
          eq(jeepneyStopsTable.id, id),
          eq(jeepneyStopsTable.version, expectedVersion),
        );
  const [updated] = await db
    .update(jeepneyStopsTable)
    .set({
      ...updates,
      version: sql`"version" + 1`,
      updatedAt: sql`now()`,
    })
    .where(where)
    .returning();

  if (!updated && expectedVersion !== undefined) {
    throw new EditConflictError(await getJeepneyStopById(id));
  }
  const current = updated ?? (await getJeepneyStopById(id));
  if (!current) return null;

  await recordEditorHistory({
    entityType: "jeepney_stop",
    entityId: id,
    action: input.isActive === false ? "remove" : "update",
    before,
    after: current,
    versionBefore: before.version,
    versionAfter: current.version,
    editedBy,
  });
  await refreshSyncKey("jeepney_routes");
  return current;
}
