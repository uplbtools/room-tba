import { createEntityMergeRoute } from "@lib/admin/entity-merge-route";
import { mergeDivisions } from "@lib/services/merge-service";

export const prerender = false;

export const POST = createEntityMergeRoute({
  entityLabel: "division",
  responseKey: "division",
  targetIdKey: "targetDivisionId",
  merge: mergeDivisions,
});
