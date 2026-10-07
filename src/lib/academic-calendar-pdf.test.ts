import { describe, expect, it } from "bun:test";
import {
  columnBoundaries,
  parseAcademicCalendar,
  parseCell,
  parseHolidays,
  sliceTable,
  termIdFor,
} from "./academic-calendar-pdf";

/**
 * Trimmed from the real `pdftotext -layout` output of
 * data/registrar/academic-calendar-2026-2027.pdf, keeping every shape that
 * broke a naive parser: a cell wrapped across three lines whose label sits on
 * the middle one, a range continuation on the line below its cell, the five
 * spellings of "nothing scheduled", an explicit year in a cell, a pre-term row
 * whose month implies the wrong year, and a range crossing new year.
 */
const FIXTURE = [
  "                                           UNIVERSITY OF THE PHILIPPINES LOS BANOS",
  "                                                ACADEMIC CALENDAR 2026-2027",
  "",
  "                                                                            FIRST SEMESTER                   SECOND SEMESTER                 MIDYEAR",
  "                                                                         (August 2026-December 2026)           (January-May 2027)          (June-July 2027)",
  "Bridge program                                                      20 Jul, Mon                                                     --",
  "Last Day for Non-Degree/Second Degree/Transfer Students to",
  "File Application for Admission",
  "   Non-Degree/Second Degree/Transfer from outside UP (T2)          12 Jun, Fri                         27 Nov 2026, Fri             --",
  "   Transfer from other UP units (Ti)                               06 Jul, Mon                         09 Dec 2026, Wed             --",
  "                                                                                                       16 Dec 2026,                 31 May, Mon —01 Jun, Tue",
  "Completion/Removal Examination Period**                             22 Jul, Wed — 24 Jul, Fri             —18 Dec 2026,",
  "                                                                                                                    WedFri",
  "MEDICAL EXAMINATION",
  " New First Year Students                                            22 Jun, Mon —03 Jul, Fri           4 Nov 2026, Wed              --",
  "                                                                                                         -5 Nov 2026, Thu",
  "  New Graduate Students                                             08 Jul, Wed —10 Jul, Fri           09 Dec 2026, Wed             --",
  "                                                                                                          -11 Dec 2026, Fri",
  "  Continuing Students                                              Optional                            Optional                     --",
  "START OF CLASSES                                                   03 Aug, Mon                         18 Jan, Mon                  07 Jun, Mon",
  "Change of Matriculation Period                                     03 Aug, Mon —07 Aug, Fri            18 Jan, Mon —22 Jan, Fri     07 Jun, Mon —08 Jun, Tue",
  "Deadline for Dropping of Subjects                                  28 Oct, Wed                         16 Apr, Fri                  05 Jul, Mon",
  "FINAL EXAMINATIONS                                                 01 Dec, Tue —07 Dec, Mon            17 May, Mon -22 May, Sat     15 Jul, Thu —16 Jul, Fri",
  "Christmas Vacation                                                 21 Dec, Mon —01 Jan, Fri                                         --",
  "Board of Regents Meeting to Confirm Graduation                     (As per BOR schedule)                As per BOR schedule)        Ms per BOR schedule)",
  "LOYALTY DAY                                                        10 Oct, Sat                         —                             =",
  "*   For the Midyear session, 3-unit lecture classes meet 1 hour and 45 minutes daily.",
  "                                                        OFFICIAL HOLIDAYS*",
  "                                                          (AY 2026-2027)",
  "",
  "                                2026                                                                    2027",
  "      Friday            21 August    Ninoy Aquino Day                      Friday              01 January    New Year's Day",
  "      Thursday          24 December        Christmas Eve                    Saturday           01 May          Labor Day",
  "                                                                                                               Eidul Fitr",
  "    * Based on Proclamation No. 1006, s. 2025.",
].join("\n");

const rowFor = (label: string) =>
  sliceTable(FIXTURE).find((row) => row.label.includes(label));

describe("columnBoundaries", () => {
  it("splits the label column from the three term columns", () => {
    const [label, first, second] = columnBoundaries(FIXTURE);
    expect(label).toBeLessThan(first ?? 0);
    expect(first).toBeLessThan(second ?? 0);
    // Cells start left of their header token; the label column must end before
    // the first cell ("20 Jul, Mon" at column 68).
    expect(label).toBeLessThanOrEqual(68);
  });
});

describe("sliceTable", () => {
  it("keeps a wrapped cell with the row whose label sits below it", () => {
    // "16 Dec 2026," prints a line ABOVE its own label because the table cell
    // is vertically centred; it belongs to Completion/Removal, not to the
    // Transfer row above it.
    expect(rowFor("Transfer from other UP units")?.cells[1]).toBe(
      "09 Dec 2026, Wed",
    );
    expect(rowFor("Completion/Removal")?.cells[1]).toBe(
      "16 Dec 2026, —18 Dec 2026, WedFri",
    );
  });

  it("keeps a range continuation with the row above it", () => {
    expect(rowFor("New First Year Students")?.cells[1]).toBe(
      "4 Nov 2026, Wed -5 Nov 2026, Thu",
    );
    expect(rowFor("New Graduate Students")?.cells[1]).toBe(
      "09 Dec 2026, Wed -11 Dec 2026, Fri",
    );
  });

  it("prefixes sub-rows with their section heading", () => {
    expect(rowFor("New Graduate Students")?.label).toBe(
      "MEDICAL EXAMINATION — New Graduate Students",
    );
  });

  it("drops heading-only lines that carry no dates", () => {
    const labels = sliceTable(FIXTURE).map((row) => row.label);
    expect(labels).not.toContain("MEDICAL EXAMINATION");
    expect(labels).not.toContain("File Application for Admission");
  });
});

describe("parseCell", () => {
  it("returns null for every spelling of an empty cell", () => {
    for (const empty of [
      "--",
      "-",
      "—",
      "=",
      "Optional",
      "(As per BOR schedule)",
      "As per BOR schedule)",
      "(To be announced)",
      "",
    ]) {
      expect(parseCell(empty, 0, 2026)).toBeNull();
    }
  });

  it("takes an explicit 4-digit year over the inferred one", () => {
    expect(parseCell("27 Nov 2026, Fri", 1, 2026)).toEqual({
      startsOn: "2026-11-27",
      endsOn: "2026-11-27",
    });
  });

  it("dates a pre-term row in the year its own term starts", () => {
    // Regression: a global "month < 8 means the AY's second year" rule put the
    // bridge program in 2027, a year after the students it is for.
    expect(parseCell("20 Jul, Mon", 0, 2026)).toEqual({
      startsOn: "2026-07-20",
      endsOn: "2026-07-20",
    });
    expect(parseCell("12 Jun, Fri", 0, 2026)?.startsOn).toBe("2026-06-12");
    // 2nd sem admin runs in the AY's first calendar year.
    expect(parseCell("06 Dec, Fri", 1, 2024)?.startsOn).toBe("2024-12-06");
    // Midyear stays in the AY's second year.
    expect(parseCell("31 May, Mon —01 Jun, Tue", 2, 2026)).toEqual({
      startsOn: "2027-05-31",
      endsOn: "2027-06-01",
    });
  });

  it("carries a range across new year", () => {
    expect(parseCell("21 Dec, Mon —01 Jan, Fri", 0, 2026)).toEqual({
      startsOn: "2026-12-21",
      endsOn: "2027-01-01",
    });
  });
});

describe("termIdFor", () => {
  it("maps AY start year and column to the CRS id", () => {
    expect([0, 1, 2].map((column) => termIdFor(2026, column))).toEqual([
      1261, 1262, 1263,
    ]);
  });
});

describe("parseHolidays", () => {
  it("reads both year columns and skips undated entries", () => {
    const holidays = parseHolidays(FIXTURE);
    expect(holidays.map((holiday) => holiday.label)).toEqual([
      "Ninoy Aquino Day",
      "New Year's Day",
      "Christmas Eve",
      "Labor Day",
    ]);
    // Eidul Fitr has no date in the PDF and must not acquire one.
    expect(holidays.some((holiday) => holiday.label.includes("Eidul"))).toBe(
      false,
    );
  });
  it("restores the tilde pdftotext drops from Los Baños", () => {
    const text = [
      "OFFICIAL HOLIDAYS*",
      "      Saturday          17 September    Los Banos Day",
    ].join("\n");
    expect(parseHolidays(text).map((holiday) => holiday.label)).toEqual([
      "Los Baños Day",
    ]);
  });
});

describe("parseAcademicCalendar", () => {
  const calendar = parseAcademicCalendar(FIXTURE);

  it("builds the term windows the app already consumes", () => {
    expect(calendar.schoolYear).toBe("2026-2027");
    expect(calendar.terms["1261"]).toEqual({
      startsOn: "2026-08-03",
      endsOn: "2026-12-07",
      finalsStartsOn: "2026-12-01",
      finalsEndsOn: "2026-12-07",
      changeOfMatriculationEndsOn: "2026-08-07",
    });
  });

  it("tags deadlines, periods and single-day milestones", () => {
    const byLabel = (needle: string) =>
      calendar.milestones.find(
        (milestone) =>
          milestone.termId === 1261 && milestone.label.includes(needle),
      );
    expect(byLabel("Dropping of Subjects")?.kind).toBe("deadline");
    expect(byLabel("FINAL EXAMINATIONS")?.kind).toBe("period");
    expect(byLabel("START OF CLASSES")?.kind).toBe("milestone");
  });

  it("emits no milestone for a cell the registrar left empty", () => {
    const midyearLabels = calendar.milestones
      .filter((milestone) => milestone.termId === 1263)
      .map((milestone) => milestone.label);
    expect(midyearLabels).not.toContain("Bridge program");
    expect(midyearLabels.some((label) => label.includes("LOYALTY"))).toBe(
      false,
    );
    expect(
      calendar.milestones.some((milestone) =>
        milestone.label.includes("Board of Regents"),
      ),
    ).toBe(false);
  });

  it("dates the holidays from the AY they fall in", () => {
    expect(calendar.holidays).toContainEqual({
      label: "Ninoy Aquino Day",
      startsOn: "2026-08-21",
    });
    expect(calendar.holidays).toContainEqual({
      label: "Labor Day",
      startsOn: "2027-05-01",
    });
  });

  it("throws when a term's dates are out of order", () => {
    const scrambled = FIXTURE.replace(
      "FINAL EXAMINATIONS                                                 01 Dec, Tue —07 Dec, Mon",
      "FINAL EXAMINATIONS                                                 01 Jul, Tue —07 Jul, Mon",
    );
    expect(() => parseAcademicCalendar(scrambled)).toThrow(/out of order/);
  });
});
