import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  normalizeClassTime,
  normalizeGenericClasses,
  parseDayTokens,
  parseGenericClassesCsv,
  parseGenericClassesJson,
  validateGenericClassEntries,
} from "./generic-class-import";
import { parseScheduleTime } from "./schedule-renderer";

const SAMPLE_DIR = join(import.meta.dir, "../../data/sample-campus");
const HEADER =
  "course_code,section,type,days,start,end,room_code,building_code,term_id,course_title";

describe("parseDayTokens", () => {
  it("splits Thursday before Tuesday", () => {
    expect(parseDayTokens("TTh")).toEqual(["T", "Th"]);
    expect(parseDayTokens("MWF")).toEqual(["M", "W", "F"]);
    expect(parseDayTokens("mtwthfs")).toEqual(["M", "T", "W", "Th", "F", "S"]);
  });

  it("rejects unknown day letters and empty strings", () => {
    expect(parseDayTokens("XYZ")).toBeNull();
    expect(parseDayTokens("Sun")).toBeNull();
    expect(parseDayTokens("")).toBeNull();
  });
});

describe("normalizeClassTime", () => {
  it("accepts 12-hour and 24-hour input", () => {
    expect(normalizeClassTime("8:00AM")).toEqual({
      label: "8:00AM",
      minutes: 480,
    });
    expect(normalizeClassTime("1:30 pm")).toEqual({
      label: "1:30PM",
      minutes: 810,
    });
    expect(normalizeClassTime("13:30")).toEqual({
      label: "1:30PM",
      minutes: 810,
    });
    expect(normalizeClassTime("12:00PM")).toEqual({
      label: "12:00PM",
      minutes: 720,
    });
    expect(normalizeClassTime("12:15AM")).toEqual({
      label: "12:15AM",
      minutes: 15,
    });
  });

  it("rejects out-of-range values", () => {
    expect(normalizeClassTime("25:00")).toBeNull();
    expect(normalizeClassTime("9:75")).toBeNull();
    expect(normalizeClassTime("0:30AM")).toBeNull();
    expect(normalizeClassTime("nine")).toBeNull();
  });
});

describe("parseGenericClassesCsv", () => {
  it("maps headers by name in any order and keeps line numbers", () => {
    const csv = [
      "term_id,course_code,section,type,days,start,end,room_code",
      "",
      '101,"BIO 101",A,LEC,MWF,9:00AM,10:00AM,BSC 1',
    ].join("\n");
    const entries = parseGenericClassesCsv(csv);
    expect(entries).toHaveLength(1);
    expect(entries[0].row).toBe(3);
    expect(entries[0].values.course_code).toBe("BIO 101");
    expect(entries[0].values.building_code).toBe("");
  });

  it("names missing required columns", () => {
    expect(() =>
      parseGenericClassesCsv("course_code,section\nBIO 101,A"),
    ).toThrow(/missing required column\(s\): type, days, start, end/);
  });
});

describe("parseGenericClassesJson", () => {
  it("coerces numeric term ids and rejects non-arrays", () => {
    const entries = parseGenericClassesJson(
      JSON.stringify([
        {
          course_code: "BIO 101",
          section: "A",
          type: "LEC",
          days: "MWF",
          start: "9:00AM",
          end: "10:00AM",
          room_code: "BSC 1",
          term_id: 101,
        },
      ]),
    );
    expect(entries[0].values.term_id).toBe("101");
    expect(() => parseGenericClassesJson("{}")).toThrow(/array/);
  });
});

describe("validateGenericClassEntries", () => {
  it("names the row number and field for every problem", () => {
    const csv = [
      HEADER,
      "BIO 101,A,LEC,MWF,9:00AM,10:00AM,BSC 1,BSC,101,General Biology",
      "CHEM 1,,SEM,XQ,26:00,9:00AM,BSC 1,BSC,abc,",
    ].join("\n");
    const issues = validateGenericClassEntries(parseGenericClassesCsv(csv));
    expect(issues.every((issue) => issue.row === 3)).toBe(true);
    expect(issues.map((issue) => issue.field).sort()).toEqual([
      "days",
      "section",
      "start",
      "term_id",
      "type",
    ]);
  });

  it("flags end before start", () => {
    const csv = [
      HEADER,
      "BIO 101,A,LEC,MWF,10:00AM,9:00AM,BSC 1,BSC,101,",
    ].join("\n");
    const issues = validateGenericClassEntries(parseGenericClassesCsv(csv));
    expect(issues).toEqual([
      { row: 2, field: "end", message: "must be after start (10:00AM-9:00AM)" },
    ]);
  });
});

describe("normalizeGenericClasses", () => {
  it("merges rows sharing term+course+section+type into one schedule", () => {
    const csv = [
      HEADER,
      "BIO 101,A,LEC,MW,9:00AM,10:00AM,BSC 1,BSC,101,General Biology",
      "BIO 101,A,LEC,F,13:00,15:00,CL AVR,CL,101,",
      "BIO 101,A,LAB,T,1:00PM,4:00PM,BSC LAB A,BSC,101,General Biology",
    ].join("\n");
    const rows = normalizeGenericClasses(parseGenericClassesCsv(csv));
    expect(rows).toHaveLength(2);
    const lec = rows.find((row) => row.type === "LEC");
    expect(lec?.schedule).toEqual(["MW 9:00AM-10:00AM", "F 1:00PM-3:00PM"]);
    expect(lec?.roomCandidates).toEqual([
      "BSC 1",
      "BSC BSC 1",
      "CL AVR",
      "CL CL AVR",
    ]);
    expect(lec?.courseTitle).toBe("General Biology");
  });

  it("emits slots the app schedule parser accepts", () => {
    const csv = [
      HEADER,
      "CS 12,A,lecture,TTh,14:30,16:00,EEB 201,EEB,102,",
    ].join("\n");
    const [row] = normalizeGenericClasses(parseGenericClassesCsv(csv));
    expect(row.type).toBe("LEC");
    const parsed = parseScheduleTime(row.schedule[0]);
    expect(parsed?.startMinutes).toBe(870);
    expect(parsed?.endMinutes).toBe(960);
  });
});

describe("sample campus dataset", () => {
  const campus = JSON.parse(
    readFileSync(join(SAMPLE_DIR, "campus.json"), "utf8"),
  ) as {
    buildings: { code: string; name: string; lat: number; lon: number }[];
    rooms: { code: string; building: string }[];
    terms: { id: number }[];
    organizations: { name: string; building: string }[];
    places: { name: string; lat: number; lon: number }[];
    aliases: { alias: string; targetType: string; target: string }[];
  };
  const classesCsv = readFileSync(join(SAMPLE_DIR, "classes.csv"), "utf8");

  it("classes.csv is valid and holds 15 sections across 2 terms", () => {
    const entries = parseGenericClassesCsv(classesCsv);
    expect(validateGenericClassEntries(entries)).toEqual([]);
    const rows = normalizeGenericClasses(entries);
    expect(rows).toHaveLength(15);
    expect(new Set(rows.map((row) => row.termId)).size).toBe(2);
    for (const row of rows) {
      for (const slot of row.schedule) {
        expect(parseScheduleTime(slot)).not.toBeNull();
      }
    }
  });

  it("cross-references resolve (rooms→buildings, classes→rooms/terms, aliases)", () => {
    const buildingCodes = new Set(campus.buildings.map((b) => b.code));
    const roomCodes = new Set(campus.rooms.map((r) => r.code));
    const termIds = new Set(campus.terms.map((t) => t.id));

    for (const room of campus.rooms) {
      expect(buildingCodes.has(room.building)).toBe(true);
    }
    for (const org of campus.organizations) {
      expect(buildingCodes.has(org.building)).toBe(true);
    }
    for (const alias of campus.aliases) {
      const pool = alias.targetType === "building" ? buildingCodes : roomCodes;
      expect(pool.has(alias.target)).toBe(true);
    }
    for (const row of normalizeGenericClasses(
      parseGenericClassesCsv(classesCsv),
    )) {
      expect(termIds.has(row.termId)).toBe(true);
      expect(roomCodes.has(row.roomCandidates[0])).toBe(true);
    }
  });

  it("sits in one small real-world map area", () => {
    const points = [
      ...campus.buildings.map((b) => ({ lat: b.lat, lon: b.lon })),
      ...campus.places.map((p) => ({ lat: p.lat, lon: p.lon })),
    ];
    for (const point of points) {
      // Golden Gate Park, San Francisco — far from any real campus dataset.
      expect(point.lat).toBeGreaterThan(37.75);
      expect(point.lat).toBeLessThan(37.79);
      expect(point.lon).toBeGreaterThan(-122.52);
      expect(point.lon).toBeLessThan(-122.42);
    }
  });
});
