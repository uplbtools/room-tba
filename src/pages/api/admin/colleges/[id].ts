import type { APIRoute } from "astro";
import { createEntityPatchRoute } from "@lib/admin/entity-patch-route";
import { errorResponse } from "@lib/api/json";
import { updateCollege, type CollegeAdmin } from "@lib/services/admin-service";

export const prerender = false;

type CollegePatchBody = {
  collegeName?: string;
  version?: number;
};

export const PATCH: APIRoute = createEntityPatchRoute<CollegeAdmin, string>({
  entityLabel: "college",
  responseKey: "college",
  validateAndBuild: (body) => {
    const b = body as CollegePatchBody;
    if (!b.collegeName || b.collegeName.trim().length === 0) {
      return {
        ok: false,
        response: errorResponse("College name is required", 400),
      };
    }
    return { ok: true, input: b.collegeName.trim(), version: b.version };
  },
  update: updateCollege,
});
