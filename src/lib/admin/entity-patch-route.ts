import type { APIRoute } from "astro";
import { editorSessionOrUnauthorized } from "@lib/admin/require-editor";
import { parseRequiredEditorVersion } from "@lib/admin/expected-version";
import { json, errorResponse, parseIdParam } from "@lib/api/json";
import {
  EditConflictError,
  DuplicateNameError,
  DuplicateSlugError,
} from "@lib/services/admin-service";

type ApplyResult<TInput> =
  | { ok: true; input: TInput; version?: number }
  | { ok: false; response: Response };

/**
 * Factory for admin PATCH routes — mirrors `createEntityMergeRoute` but for
 * single-entity updates. Faktors out the identical auth → parse-id → parse-body
 * → version → error-catch shell so each route only provides its validation +
 * update logic.
 */
export function createEntityPatchRoute<TEntity, TInput>(options: {
  entityLabel: string;
  responseKey: string;
  /**
   * Validate the parsed body and build the input for the update function.
   * Return `{ ok: true, input, version }` to proceed or
   * `{ ok: false, response }` to short-circuit with an error.
   */
  validateAndBuild: (body: unknown) => ApplyResult<TInput>;
  /** The service-layer update function. */
  update: (
    id: number,
    input: TInput,
    expectedVersion: number,
    editedBy: string,
  ) => Promise<TEntity | null>;
}): APIRoute {
  return async ({ cookies, params, request }) => {
    const auth = await editorSessionOrUnauthorized(cookies, {
      requirePublish: true,
    });
    if (auth instanceof Response) return auth;

    const id = parseIdParam(params.id);
    if (id === null) {
      return errorResponse(`Invalid ${options.entityLabel} ID`, 400);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const result = options.validateAndBuild(body);
    if (!result.ok) return result.response;

    const parsedVersion = parseRequiredEditorVersion(result.version);
    if (!parsedVersion.ok) return parsedVersion.response;

    try {
      const entity = await options.update(
        id,
        result.input,
        parsedVersion.version,
        auth.editedBy,
      );
      return json({ success: true, [options.responseKey]: entity });
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

      if (err instanceof DuplicateSlugError) {
        return json({ error: err.message }, 409);
      }

      console.error(`Failed to update ${options.entityLabel}:`, err);
      return errorResponse(`Failed to save ${options.entityLabel}`, 500);
    }
  };
}
