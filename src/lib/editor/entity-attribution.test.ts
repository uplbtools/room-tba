import { describe, expect, test } from "bun:test";
import { parseEntityAttributionRequest } from "./entity-attribution";

describe("parseEntityAttributionRequest", () => {
  test("accepts supported entity attribution requests", () => {
    expect(
      parseEntityAttributionRequest(
        new URLSearchParams({ entityType: "building", entityId: "12" }),
      ),
    ).toEqual({ ok: true, entityType: "building", entityId: 12 });
  });

  test("rejects unsupported entity types and invalid ids", () => {
    expect(
      parseEntityAttributionRequest(
        new URLSearchParams({ entityType: "alias", entityId: "12" }),
      ),
    ).toMatchObject({ ok: false, status: 400 });
    expect(
      parseEntityAttributionRequest(
        new URLSearchParams({ entityType: "room", entityId: "0" }),
      ),
    ).toMatchObject({ ok: false, status: 400 });
  });
});
