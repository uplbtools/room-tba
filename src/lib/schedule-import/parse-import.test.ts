import { describe, expect, it } from "bun:test";
import { matchKey, parseScheduleImport } from "./parse-import";

describe("parseScheduleImport", () => {
  it("parses AMIS Schedule Extractor JSON array", () => {
    const result = parseScheduleImport(
      JSON.stringify([
        {
          course_code: "CMSC 123",
          section: "A",
          type: "LEC",
          schedule: ["MW 08:00AM-09:00AM"],
        },
      ]),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toEqual({
        courseCode: "CMSC 123",
        section: "A",
        type: "LEC",
        schedule: ["MW 08:00AM-09:00AM"],
      });
    }
  });

  it("strips instructor fields from nested payloads", () => {
    const result = parseScheduleImport(
      JSON.stringify({
        classes: {
          data: [
            {
              course_code: "HK 12",
              section: "AB",
              type: "LEC",
              schedule: ["MW 07:00AM-08:00AM"],
              faculty: "SHOULD NOT APPEAR",
            },
          ],
        },
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("rejects JSON without course rows", () => {
    const result = parseScheduleImport(JSON.stringify([{ last_name: "DOE" }]));
    expect(result.ok).toBe(false);
  });

  it("parses CSV with standard headers", () => {
    const csv = [
      "course_code,section,type,schedule",
      "CMSC 170,B,LAB,M 01:00PM-04:00PM",
    ].join("\n");
    const result = parseScheduleImport(csv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows[0].courseCode).toBe("CMSC 170");
      expect(result.rows[0].schedule).toEqual(["M 01:00PM-04:00PM"]);
    }
  });
});

describe("matchKey", () => {
  it("normalizes lookup keys", () => {
    expect(matchKey("cmsc 123", "a", "lec")).toBe("CMSC 123::A::LEC");
  });
});
