import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import {
  EditConflictError,
  DuplicateNameError,
} from "@lib/services/admin-service";
import { mergeRooms } from "@lib/services/merge-service";

export const prerender = false;

type RoomMergeBody = {
  targetRoomId?: number;
  sourceVersion?: number;
  preferredRoomCode?: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ cookies, params, request }) => {
  const auth = await editorSessionOrUnauthorized(cookies, {
    requirePublish: true,
  });
  if (auth instanceof Response) return auth;

  const sourceId = parseInt(params["id"] ?? "");
  if (isNaN(sourceId)) {
    return json({ error: "Invalid room ID" }, 400);
  }

  let body: RoomMergeBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const targetRoomId = body.targetRoomId;
  const sourceVersion = body.sourceVersion;

  if (!Number.isInteger(targetRoomId)) {
    return json({ error: "Target room ID is required" }, 400);
  }
  if (!Number.isInteger(sourceVersion)) {
    return json({ error: "Source room version is required" }, 400);
  }

  const preferredRoomCode =
    typeof body.preferredRoomCode === "string"
      ? body.preferredRoomCode.trim()
      : undefined;

  try {
    const room = await mergeRooms({
      sourceId,
      targetId: targetRoomId as number,
      sourceVersion: sourceVersion as number,
      preferredRoomCode,
      editedBy: auth.editedBy,
    });

    return json({ success: true, room, mergedFromRoomId: sourceId });
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

    if (err instanceof DuplicateNameError) {
      return json(
        {
          error: err.message,
          code: "duplicate_name",
          entityType: err.entityType,
          mergeCandidate: err.candidate,
          attemptedName: err.attemptedName,
        },
        409,
      );
    }

    if (err instanceof Error) {
      return json({ error: err.message }, 400);
    }

    console.error("Failed to merge rooms:", err);
    return json({ error: "Failed to merge rooms" }, 500);
  }
};
