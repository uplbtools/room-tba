import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertCampusGateCoordinatesHeaders,
  CAMPUS_GATE_COORDINATES_HEADERS,
  parseCampusGateCoordinatesCsv,
  parseCsvRow,
  validateCampusGateCoordinatesCsv,
  validateCampusGateRow,
} from "./campus-gate-coordinates-template";

const TEMPLATE_PATH = join(
  import.meta.dir,
  "../../data/campus-gate-coordinates-template.csv",
);
const CONTRIBUTING_PATH = join(import.meta.dir, "../../CONTRIBUTING.md");
const VOLUNTEER_TRIAGE_PATH = join(
  import.meta.dir,
  "../../docs/volunteer-triage.md",
);
const ISSUE_TEMPLATE_PATH = join(
  import.meta.dir,
  "../../.github/ISSUE_TEMPLATE/gate_coordinates_batch.yml",
);

describe("campus-gate-coordinates-template", () => {
  it("parses quoted CSV fields", () => {
    expect(parseCsvRow('a,"b,c",d')).toEqual(["a", "b,c", "d"]);
  });

  it("repo template has expected headers and starter rows", () => {
    const text = readFileSync(TEMPLATE_PATH, "utf8");
    const parsed = parseCampusGateCoordinatesCsv(text);
    assertCampusGateCoordinatesHeaders(parsed.headers);
    expect(parsed.skippedInstructionRows).toBe(1);
    expect(parsed.rows.length).toBeGreaterThanOrEqual(4);
    expect(parsed.rows.map((row) => row.name)).toContain("Raymundo Gate");
    expect(parsed.rows.every((row) => !row.lat && !row.lon)).toBe(true);
  });

  it("allows draft rows without coordinates", () => {
    const errors = validateCampusGateRow({
      name: "Test Gate",
      short_name: "",
      slug: "test-gate",
      gate_type: "both",
      lat: "",
      lon: "",
      is_primary: "false",
      directions: "",
      osm_link: "",
      verified: "no",
      verification_method: "",
      notes: "",
    });
    expect(errors).toEqual([]);
  });

  it("requires coordinates and verification for submission rows", () => {
    const errors = validateCampusGateRow(
      {
        name: "Raymundo Gate",
        short_name: "Raymundo",
        slug: "raymundo-gate",
        gate_type: "both",
        lat: "14.16774",
        lon: "121.24161",
        is_primary: "false",
        directions: "Along Raymundo Road",
        osm_link: "",
        verified: "yes",
        verification_method: "On-site GPS at gate sign",
        notes: "",
      },
      { requireCoordinates: true },
    );
    expect(errors).toEqual([]);
  });

  it("rejects out-of-campus coordinates", () => {
    const errors = validateCampusGateRow(
      {
        name: "Far Gate",
        short_name: "",
        slug: "",
        gate_type: "both",
        lat: "14.5",
        lon: "121.0",
        is_primary: "false",
        directions: "",
        osm_link: "",
        verified: "yes",
        verification_method: "walked",
        notes: "",
      },
      { requireCoordinates: true },
    );
    expect(errors.some((e) => e.includes("lat"))).toBe(true);
    expect(errors.some((e) => e.includes("lon"))).toBe(true);
  });

  it("validateCampusGateCoordinatesCsv flags invalid gate_type", () => {
    const csv = [
      CAMPUS_GATE_COORDINATES_HEADERS.join(","),
      "Bad Gate,,,service,,,false,,,no,,",
    ].join("\n");
    const invalid = validateCampusGateCoordinatesCsv(csv);
    expect(invalid).toHaveLength(1);
    expect(invalid[0]?.errors).toContain(
      "gate_type must be vehicle, pedestrian, or both",
    );
  });
});

describe("volunteer gate coordinates onboarding", () => {
  it("CONTRIBUTING documents the spreadsheet workflow", () => {
    const doc = readFileSync(CONTRIBUTING_PATH, "utf8");
    expect(doc).toContain("Campus gate coordinates");
    expect(doc).toContain("campus-gate-coordinates-template.csv");
    expect(doc).toContain("gate_coordinates_batch.yml");
  });

  it("volunteer triage links to gate coordinates workflow", () => {
    const doc = readFileSync(VOLUNTEER_TRIAGE_PATH, "utf8");
    expect(doc).toContain("Campus gate coordinates");
    expect(doc).toContain("campus-gate-coordinates-template.csv");
  });

  it("batch issue template covers submission fields", () => {
    const template = readFileSync(ISSUE_TEMPLATE_PATH, "utf8");
    expect(template).toContain("Gate coordinates (batch)");
    expect(template).toContain("spreadsheet");
    expect(template).toContain("verification");
  });
});
