import { createEntityMergeRoute } from "@lib/admin/entity-merge-route";
import { mergeDorms } from "@lib/services/merge-service";

export const prerender = false;

export const POST = createEntityMergeRoute({
  entityLabel: "dorm",
  responseKey: "dorm",
  targetIdKey: "targetDormId",
  merge: mergeDorms,
});
