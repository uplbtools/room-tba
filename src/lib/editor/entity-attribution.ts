const ATTRIBUTABLE_ENTITY_TYPES = new Set([
  "building",
  "room",
  "dorm",
  "college",
  "division",
  "event",
]);

export type EntityAttributionRequest =
  | {
      ok: true;
      entityType: string;
      entityId: number;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

export function parseEntityAttributionRequest(
  params: URLSearchParams,
): EntityAttributionRequest {
  const entityType = params.get("entityType") ?? "";
  const entityId = Number(params.get("entityId"));

  if (!ATTRIBUTABLE_ENTITY_TYPES.has(entityType)) {
    return { ok: false, status: 400, error: "Unsupported entity type." };
  }
  if (!Number.isInteger(entityId) || entityId < 1) {
    return { ok: false, status: 400, error: "Invalid entity ID." };
  }

  return { ok: true, entityType, entityId };
}
