import type { APIRoute } from "astro";
import { updateRoom, upsertRoomPosition } from "../../../../lib/services/admin-service";

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request }) => {
  const id = parseInt(params["id"] ?? "");
  if (isNaN(id)) {
    return new Response(JSON.stringify({ error: "Invalid room ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { roomCode, directions, buildingId, collegeId, divisionId, position } = body as {
    roomCode?: string;
    directions?: string | null;
    buildingId?: number | null;
    collegeId?: number | null;
    divisionId?: number | null;
    position?: { floor: number; posX: string; posY: string };
  };

  if (!roomCode || roomCode.trim().length === 0) {
    return new Response(JSON.stringify({ error: "Room code is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await updateRoom(id, {
      roomCode: roomCode.trim(),
      directions: directions ?? null,
      buildingId: buildingId ?? null,
      collegeId: collegeId ?? null,
      divisionId: divisionId ?? null,
    });

    if (position) {
      await upsertRoomPosition(id, {
        floor: position.floor,
        posX: position.posX,
        posY: position.posY,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Failed to update room:", err);
    return new Response(JSON.stringify({ error: "Failed to save room" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
