import type { APIRoute } from "astro";
import {
  ADMIN_COOKIE_NAME,
  verifySessionToken,
} from "../../../../lib/admin/auth";
import {
  EditConflictError,
  updateRoom,
  upsertRoomPosition,
} from "../../../../lib/services/admin-service";

export const prerender = false;

type RoomPatchBody = {
  roomCode?: string;
  directions?: string | null;
  buildingId?: number | null;
  collegeId?: number | null;
  divisionId?: number | null;
  version?: number;
  position?: { floor: number; posX: string; posY: string };
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function invalidRelationId(value: unknown) {
  return value !== undefined && value !== null && !Number.isInteger(value);
}

export const PATCH: APIRoute = async ({ cookies, params, request }) => {
  if (!verifySessionToken(cookies.get(ADMIN_COOKIE_NAME)?.value)) {
    return json({ error: "Unauthorized" }, 401);
  }

  const id = parseInt(params["id"] ?? "");
  if (isNaN(id)) {
    return json({ error: "Invalid room ID" }, 400);
  }

  let body: RoomPatchBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (body.roomCode !== undefined && body.roomCode.trim().length === 0) {
    return json({ error: "Room code is required" }, 400);
  }

  if (invalidRelationId(body.buildingId)) {
    return json({ error: "Building must be a valid selection" }, 400);
  }
  if (invalidRelationId(body.collegeId)) {
    return json({ error: "College must be a valid selection" }, 400);
  }
  if (invalidRelationId(body.divisionId)) {
    return json({ error: "Division must be a valid selection" }, 400);
  }

  const expectedVersion = Number.isInteger(body.version)
    ? body.version
    : undefined;

  try {
    const updates: Parameters<typeof updateRoom>[1] = {};
    if (body.roomCode !== undefined) updates.roomCode = body.roomCode.trim();
    if (body.directions !== undefined) {
      updates.directions = body.directions?.trim() || null;
    }
    if (body.buildingId !== undefined) updates.buildingId = body.buildingId;
    if (body.collegeId !== undefined) updates.collegeId = body.collegeId;
    if (body.divisionId !== undefined) updates.divisionId = body.divisionId;

    const room = await updateRoom(id, updates, expectedVersion);

    if (body.position) {
      await upsertRoomPosition(id, {
        floor: body.position.floor,
        posX: body.position.posX,
        posY: body.position.posY,
      });
    }

    return json({ success: true, room });
  } catch (err) {
    if (err instanceof EditConflictError) {
      return json(
        {
          error: "This room was changed by another editor.",
          latest: err.latest,
        },
        409,
      );
    }

    console.error("Failed to update room:", err);
    return json({ error: "Failed to save room" }, 500);
  }
};
