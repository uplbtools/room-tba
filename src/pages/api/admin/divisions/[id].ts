import type { APIRoute } from "astro";
import { createEntityPatchRoute } from "@lib/admin/entity-patch-route";
import { errorResponse } from "@lib/api/json";
import {
  updateDivision,
  type DivisionAdmin,
  type DivisionUpdateInput,
} from "@lib/services/admin-service";

export const prerender = false;

type DivisionPatchBody = {
  divisionName?: string;
  collegeId?: number | null;
  version?: number;
};

function invalidCollegeId(value: unknown) {
  return value !== undefined && value !== null && !Number.isInteger(value);
}

export const PATCH: APIRoute = createEntityPatchRoute<
  DivisionAdmin,
  DivisionUpdateInput
>({
  entityLabel: "division",
  responseKey: "division",
  validateAndBuild: (body) => {
    const b = body as DivisionPatchBody;
    if (b.divisionName !== undefined && b.divisionName.trim().length === 0) {
      return {
        ok: false,
        response: errorResponse("Division name is required", 400),
      };
    }
    if (invalidCollegeId(b.collegeId)) {
      return {
        ok: false,
        response: errorResponse("College must be a valid selection", 400),
      };
    }
    const input: DivisionUpdateInput = {};
    if (b.divisionName !== undefined)
      input.divisionName = b.divisionName.trim();
    if (b.collegeId !== undefined) input.collegeId = b.collegeId;
    if (Object.keys(input).length === 0) {
      return {
        ok: false,
        response: errorResponse("No division fields to update", 400),
      };
    }
    return { ok: true, input, version: b.version };
  },
  update: updateDivision,
});
