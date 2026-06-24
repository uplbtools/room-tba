import type { APIRoute } from "astro";
import { eq, inArray } from "drizzle-orm";
import type { AstroCookies } from "astro";
import { db } from "../../lib/db";
import {
  buildingsTable,
  roomPositionsTable,
  roomsTable,
} from "../../../drizzle/schema";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "../../lib/admin/auth";
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

function isAdmin(cookies: AstroCookies): boolean {
  return verifySessionToken(cookies.get(ADMIN_COOKIE_NAME)?.value);
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

export const PUT: APIRoute = async ({ request, cookies, url }) => {
  if (!isAdmin(cookies)) return jsonError(401, "Not authorized");

  const buildingName = url.searchParams.get("building");
  if (!buildingName) {
    return jsonError(400, "Missing required ?building= query param");
  }

  let body: { positions?: PositionDTO[] };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const positions = Array.isArray(body.positions) ? body.positions : null;
  if (!positions) {
    return jsonError(400, "Body must be { positions: [...] }");
  }

  for (const p of positions) {
    if (
      typeof p.roomCode !== "string" ||
      typeof p.floor !== "number" ||
      typeof p.x !== "number" ||
      typeof p.y !== "number" ||
      !Number.isFinite(p.floor) ||
      !Number.isFinite(p.x) ||
      !Number.isFinite(p.y)
    ) {
      return jsonError(400, "Each position needs { roomCode, floor, x, y }");
    }
  }

  if (positions.length === 0) {
    return jsonOk({ saved: 0 });
  }

  // Resolve room codes -> ids, scoped to the building. This prevents an editor
  // from accidentally (or maliciously) writing positions for a room in a
  // different building by reusing a code.
  const codes = positions.map((p) => p.roomCode);
  const roomRows = await db
    .select({ id: roomsTable.id, code: roomsTable.roomCode })
    .from(roomsTable)
    .innerJoin(buildingsTable, eq(buildingsTable.id, roomsTable.buildingId))
    .where(eq(buildingsTable.buildingName, buildingName));

  const codeToId = new Map<string, number>();
  for (const r of roomRows) codeToId.set(r.code, r.id);

  const updatedAt = new Date().toISOString();
  const rows = positions
    .map((p) => {
      const id = codeToId.get(p.roomCode);
      if (id === undefined) return null;
      return {
        roomId: id,
        floor: Math.max(1, Math.floor(p.floor)),
        posX: String(p.x),
        posY: String(p.y),
        updatedAt,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length === 0) {
    return jsonOk({ saved: 0, skipped: positions.length });
  }

  await db.transaction(async (tx) => {
    for (const row of rows) {
      const existing = await tx
        .select({ id: roomPositionsTable.id })
        .from(roomPositionsTable)
        .where(eq(roomPositionsTable.roomId, row.roomId))
        .limit(1);

      if (existing[0]) {
        await tx
          .update(roomPositionsTable)
          .set({
            floor: row.floor,
            posX: row.posX,
            posY: row.posY,
            updatedAt: row.updatedAt,
          })
          .where(eq(roomPositionsTable.id, existing[0].id));
      } else {
        await tx.insert(roomPositionsTable).values(row);
      }
    }
  });
  await refreshSyncKey("rooms");

  return jsonOk({ saved: rows.length, skipped: positions.length - rows.length });
};

export const DELETE: APIRoute = async ({ cookies, url }) => {
  if (!isAdmin(cookies)) return jsonError(401, "Not authorized");

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
