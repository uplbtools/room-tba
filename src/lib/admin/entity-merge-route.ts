import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import { json } from "@lib/api/json";
import {
  EditConflictError,
  DuplicateNameError,
} from "@lib/services/admin-service";

type MergeHandler<TEntity> = (input: {
  sourceId: number;
  targetId: number;
  sourceVersion: number;
  preferredName?: string;
  editedBy: string;
}) => Promise<TEntity>;

type EntityMergeBody = {
  targetRoomId?: number;
  targetBuildingId?: number;
  targetCollegeId?: number;
  targetDivisionId?: number;
  targetDormId?: number;
  sourceVersion?: number;
  preferredRoomCode?: string;
  preferredName?: string;
};

export function createEntityMergeRoute<TEntity>(options: {
  entityLabel: string;
  responseKey: string;
  targetIdKey: keyof EntityMergeBody;
  preferredNameKey?: keyof EntityMergeBody;
  merge: MergeHandler<TEntity>;
}): APIRoute {
  return async ({ cookies, params, request }) => {
    const auth = await editorSessionOrUnauthorized(cookies, {
      requirePublish: true,
    });
    if (auth instanceof Response) return auth;

    const sourceId = parseInt(params.id ?? "", 10);
    if (Number.isNaN(sourceId)) {
      return json({ error: `Invalid ${options.entityLabel} ID` }, 400);
    }

    let body: EntityMergeBody;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const targetId = body[options.targetIdKey];
    const sourceVersion = body.sourceVersion;

    if (!Number.isInteger(targetId)) {
      return json(
        { error: `Target ${options.entityLabel} ID is required` },
        400,
      );
    }
    if (!Number.isInteger(sourceVersion)) {
      return json({ error: "Source version is required" }, 400);
    }

    const preferredNameKey = options.preferredNameKey ?? "preferredName";
    const preferredRaw = body[preferredNameKey];
    const preferredName =
      typeof preferredRaw === "string" ? preferredRaw.trim() : undefined;

    try {
      const entity = await options.merge({
        sourceId,
        targetId: targetId as number,
        sourceVersion: sourceVersion as number,
        preferredName,
        editedBy: auth.editedBy,
      });

      return json({
        success: true,
        [options.responseKey]: entity,
        mergedFromId: sourceId,
      });
    } catch (err) {
      if (err instanceof EditConflictError) {
        return json(
          {
            error: `This ${options.entityLabel} was changed by another editor.`,
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

      console.error(`Failed to merge ${options.entityLabel}:`, err);
      return json({ error: `Failed to merge ${options.entityLabel}` }, 500);
    }
  };
}
