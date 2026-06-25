import type { APIRoute } from "astro";
import { eq, inArray } from "drizzle-orm";
import type { AstroCookies } from "astro";
import { db } from "../../lib/db";
import {
  buildingsTable,
  roomPositionsTable,
  roomsTable,
} from "../../../drizzle/schema";
import { canPublishDirectly } from "../../lib/admin/auth";
import { getEditorSession } from "../../lib/admin/require-editor";
import { refreshSyncKey } from "../../lib/services/admin-service";

export const prerender = false;

type PositionDTO = {
  roomCode: string;
  floor: number;
  x: number;
  y: number;
};

function jsonError(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function jsonOk<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function canPublish(cookies: AstroCookies): boolean {
  const session = getEditorSession(cookies);
  return session !== null && canPublishDirectly(session.role);
}

export const GET: APIRoute = async ({ url }) => {
  const buildingName = url.searchParams.get("building");
  if (!buildingName) {
    return jsonError(400, "Missing required ?building= query param");
  }

  const rows = await db
    .select({
      roomCode: roomsTable.roomCode,
      floor: roomPositionsTable.floor,
      x: roomPositionsTable.posX,
      y: roomPositionsTable.posY,
    })
    .from(roomPositionsTable)
    .innerJoin(roomsTable, eq(roomsTable.id, roomPositionsTable.roomId))
    .innerJoin(buildingsTable, eq(buildingsTable.id, roomsTable.buildingId))
    .where(eq(buildingsTable.buildingName, buildingName));

  return jsonOk({
    positions: rows.map((row) => ({
      roomCode: row.roomCode,
      floor: row.floor,
      x: Number(row.x),
      y: Number(row.y),
    })) satisfies PositionDTO[],
  });
};

export const PUT: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      error:
        "Position writes must use /api/admin/rooms/:id with a room version.",
    }),
    {
      status: 405,
      headers: {
        "content-type": "application/json",
        allow: "GET, DELETE",
      },
    },
  );
};

export const DELETE: APIRoute = async ({ cookies, url }) => {
  if (!canPublish(cookies)) return jsonError(401, "Not authorized");

  const buildingName = url.searchParams.get("building");
  const roomCode = url.searchParams.get("room");
  if (!buildingName || !roomCode) {
    return jsonError(400, "Missing ?building= and/or ?room= query params");
  }

  const rooms = await db
    .select({ id: roomsTable.id })
    .from(roomsTable)
    .innerJoin(buildingsTable, eq(buildingsTable.id, roomsTable.buildingId))
    .where(eq(buildingsTable.buildingName, buildingName));

  const roomIds = rooms.map((r) => r.id);
  if (roomIds.length === 0) return jsonOk({ deleted: 0 });

  // Single-room delete in this building.
  const targets = await db
    .select({ id: roomsTable.id })
    .from(roomsTable)
    .where(eq(roomsTable.roomCode, roomCode));
  const targetIds = targets
    .map((t) => t.id)
    .filter((id) => roomIds.includes(id));

  if (targetIds.length === 0) return jsonOk({ deleted: 0 });

  await db
    .delete(roomPositionsTable)
    .where(inArray(roomPositionsTable.roomId, targetIds));
  await refreshSyncKey("rooms");

  return jsonOk({ deleted: targetIds.length });
};
