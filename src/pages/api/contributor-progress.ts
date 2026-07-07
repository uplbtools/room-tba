import type { APIRoute } from "astro";
import { eq, sql } from "drizzle-orm";
import {
  buildingsTable,
  classesTable,
  editorHistoryTable,
  roomPositionsTable,
  roomsTable,
} from "@drizzle/schema";
import { sessionEditedBy } from "@lib/admin/auth";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import {
  aggregateHistoryByEntityType,
  buildRoomProgressRows,
  computeBuildingBreakdown,
  hasBuildingPin,
  isNonEmptyText,
  summarizeFieldCounts,
  topBuildingsByGap,
  type BuildingContributorProgress,
  type CampusContributorProgress,
  type MineContributorProgress,
  type RoomProgressInput,
} from "@lib/contributor-progress";
import { db } from "@lib/db";
import { getDefaultTerm } from "@lib/services/term-service";

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies }) => {
  const scope = url.searchParams.get("scope") ?? "campus";
  const buildingIdRaw = url.searchParams.get("buildingId");

  if (scope === "mine") {
    const auth = await editorSessionOrUnauthorized(cookies);
    if (auth instanceof Response) return auth;
    return json(await fetchMineProgress(sessionEditedBy(auth.session)));
  }

  if (scope === "building") {
    const buildingId = Number(buildingIdRaw);
    if (!Number.isFinite(buildingId)) {
      return json({ success: false, error: "buildingId is required" }, 400);
    }
    const result = await fetchBuildingProgress(buildingId);
    if (result instanceof Response) return result;
    return json(result);
  }

  if (scope === "campus") {
    return json(await fetchCampusProgress());
  }

  return json({ success: false, error: "Invalid scope" }, 400);
};

async function fetchCampusProgress(): Promise<{
  success: true;
  data: CampusContributorProgress;
}> {
  const term = await getDefaultTerm();
  const { roomInputs, buildingNames, buildings } = await loadRoomInputs(
    term?.id ?? null,
  );
  const roomRows = buildRoomProgressRows(roomInputs);
  const roomCounts = summarizeFieldCounts(roomRows);
  const breakdown = topBuildingsByGap(
    computeBuildingBreakdown(roomRows, buildingNames),
  );

  const buildingTotal = buildings.length;
  let pinFilled = 0;
  let directionsFilled = 0;

  for (const building of buildings) {
    if (hasBuildingPin(building.lat, building.lon)) pinFilled += 1;
    if (isNonEmptyText(building.directions)) directionsFilled += 1;
  }

  return {
    success: true,
    data: {
      scope: "campus",
      termId: term?.id ?? null,
      termLabel: term?.label ?? null,
      rooms: roomCounts,
      buildings: {
        total: buildingTotal,
        pins: { filled: pinFilled, total: buildingTotal },
        directions: { filled: directionsFilled, total: buildingTotal },
      },
      topBuildings: breakdown,
    },
  };
}

async function fetchBuildingProgress(
  buildingId: number,
): Promise<{ success: true; data: BuildingContributorProgress } | Response> {
  const building = await db
    .select({
      id: buildingsTable.id,
      buildingName: buildingsTable.buildingName,
    })
    .from(buildingsTable)
    .where(eq(buildingsTable.id, buildingId))
    .limit(1);

  if (building.length === 0) {
    return json({ success: false, error: "Building not found" }, 404);
  }

  const term = await getDefaultTerm();
  const { roomInputs } = await loadRoomInputs(term?.id ?? null, buildingId);
  const roomRows = buildRoomProgressRows(roomInputs).sort((a, b) =>
    a.code.localeCompare(b.code),
  );

  return {
    success: true,
    data: {
      scope: "building",
      buildingId,
      buildingName: building[0].buildingName,
      termId: term?.id ?? null,
      termLabel: term?.label ?? null,
      rooms: summarizeFieldCounts(roomRows),
      roomRows,
    },
  };
}

async function fetchMineProgress(editedBy: string): Promise<{
  success: true;
  data: MineContributorProgress;
}> {
  const rows = await db
    .select({
      entityType: editorHistoryTable.entityType,
      count: sql<number>`count(*)::int`,
    })
    .from(editorHistoryTable)
    .where(eq(editorHistoryTable.editedBy, editedBy))
    .groupBy(editorHistoryTable.entityType);

  const { totalEdits, byEntityType } = aggregateHistoryByEntityType(rows);

  return {
    success: true,
    data: {
      scope: "mine",
      editedBy,
      totalEdits,
      byEntityType,
    },
  };
}

async function loadRoomInputs(
  termId: number | null,
  buildingId?: number,
): Promise<{
  roomInputs: RoomProgressInput[];
  buildingNames: Map<number, string>;
  buildings: Array<{
    id: number;
    buildingName: string;
    lat: number;
    lon: number;
    directions: string;
  }>;
}> {
  const roomsQuery = db
    .select({
      id: roomsTable.id,
      code: roomsTable.roomCode,
      buildingId: roomsTable.buildingId,
      directions: roomsTable.directions,
    })
    .from(roomsTable);

  const rooms =
    buildingId != null
      ? await roomsQuery.where(eq(roomsTable.buildingId, buildingId))
      : await roomsQuery;

  const classCounts =
    termId != null
      ? await db
          .select({
            roomId: classesTable.roomId,
            count: sql<number>`count(*)::int`,
          })
          .from(classesTable)
          .where(eq(classesTable.termId, termId))
          .groupBy(classesTable.roomId)
      : [];

  const classCountByRoom = new Map<number, number>();
  for (const row of classCounts) {
    if (row.roomId != null) {
      classCountByRoom.set(row.roomId, row.count);
    }
  }

  const positionRows = await db
    .select({ roomId: roomPositionsTable.roomId })
    .from(roomPositionsTable);
  const positionedRoomIds = new Set(positionRows.map((row) => row.roomId));

  const buildings = await db
    .select({
      id: buildingsTable.id,
      buildingName: buildingsTable.buildingName,
      lat: buildingsTable.lat,
      lon: buildingsTable.lon,
      directions: buildingsTable.directions,
    })
    .from(buildingsTable);

  const buildingNames = new Map(
    buildings.map((building) => [building.id, building.buildingName]),
  );

  const roomInputs: RoomProgressInput[] = rooms.map((room) => ({
    id: room.id,
    code: room.code,
    buildingId: room.buildingId,
    directions: room.directions,
    classCount: classCountByRoom.get(room.id) ?? 0,
    hasPosition: positionedRoomIds.has(room.id),
  }));

  return { roomInputs, buildingNames, buildings };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
