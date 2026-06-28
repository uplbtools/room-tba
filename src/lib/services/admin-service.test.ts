import { describe, expect, test } from "bun:test";
import { EditConflictError } from "./edit-conflict-error";

describe("EditConflictError", () => {
  test("carries latest entity for 409 responses", () => {
    const latest = { id: 3, version: 7, buildingName: "Updated" };
    const error = new EditConflictError(latest);

    expect(error.name).toBe("EditConflictError");
    expect(error.message).toContain("changed by another editor");
    expect(error.latest).toEqual(latest);
  });
});
