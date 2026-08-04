import { describe, expect, it } from "bun:test";
import rawAcadOrgs from "../../data/acad-orgs.json";
import { decodeAcadOrg } from "./acad-orgs";

describe("decodeAcadOrg (#846)", () => {
  it("decodes a curated code", () => {
    expect(decodeAcadOrg("LBICS")).toEqual({
      name: "Institute of Computer Science",
      collegeCode: "CAS",
    });
  });

  it("matches mixed-case AMIS codes case-insensitively", () => {
    expect(decodeAcadOrg("LBIoP")?.name).toBe("Institute of Physics");
    expect(decodeAcadOrg("lbics")?.name).toBe("Institute of Computer Science");
  });

  it("returns null for uncurated, blank, and null codes", () => {
    expect(decodeAcadOrg("LBNOPE")).toBeNull();
    expect(decodeAcadOrg("")).toBeNull();
    expect(decodeAcadOrg(null)).toBeNull();
    expect(decodeAcadOrg(undefined)).toBeNull();
    expect(decodeAcadOrg("$comment")).toBeNull();
  });

  it("every data-file entry has a non-empty name (and decodes)", () => {
    for (const [code, entry] of Object.entries(rawAcadOrgs)) {
      if (code.startsWith("$")) continue;
      expect(typeof entry).toBe("object");
      const { name } = entry as { name?: string };
      expect(name && name.length > 0).toBe(true);
      expect(decodeAcadOrg(code)?.name).toBe(name as string);
    }
  });
});
