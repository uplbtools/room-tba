import { describe, expect, it } from "bun:test";
import { crFacilityLabel, sanitizeCrFacilities } from "./cr-facilities";

describe("sanitizeCrFacilities", () => {
  it("keeps known slugs in canonical order, drops junk and dupes", () => {
    expect(
      sanitizeCrFacilities(["pwd-accessible", "bidet", "bidet", "jacuzzi", 3]),
    ).toEqual(["bidet", "pwd-accessible"]);
  });

  it("returns [] for non-arrays", () => {
    expect(sanitizeCrFacilities(null)).toEqual([]);
    expect(sanitizeCrFacilities("bidet")).toEqual([]);
  });
});

describe("crFacilityLabel", () => {
  it("labels known slugs and echoes unknown ones", () => {
    expect(crFacilityLabel("bidet")).toBe("Bidet");
    expect(crFacilityLabel("mystery")).toBe("mystery");
  });
});
