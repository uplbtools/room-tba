import { describe, expect, it } from "bun:test";
import { normalizeEntityName } from "@lib/entity-names";

describe("entity merge duplicate detection", () => {
  it("treats spacing and punctuation variants as the same name", () => {
    expect(normalizeEntityName("Physical  Sciences")).toBe(
      normalizeEntityName("Physical-Sciences"),
    );
    expect(normalizeEntityName("CAS")).toBe(normalizeEntityName("C.A.S."));
  });
});
