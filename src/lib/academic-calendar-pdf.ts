/**
 * Parse the OUR "Academic Calendar" PDF (as `pdftotext -layout` text) into the
 * term windows, milestone rows and official holidays that
 * data/academic-calendar-{AY}.json stores.
 *
 * The registrar publishes one wide table: rows are milestones, the three
 * columns are 1st sem / 2nd sem / midyear. Everything here is driven by the
 * column geometry `pdftotext -layout` preserves, because the OCR'd PDFs wrap a
 * single cell across several lines — a line-per-row regex silently drops the
 * second half of those cells.
 *
 * Accuracy rules (a wrong date here makes a student miss a deadline):
 *  - a cell with no date is `null`, never the nearest date;
 *  - an explicit 4-digit year in the cell always wins;
 *  - otherwise the year is the one that puts the date closest to that
 *    column's own anchor month, so pre-term rows land in the right year;
 *  - the per-term ordering invariant throws instead of warning.
 */

const MONTHS: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

/** Every way the registrar prints "nothing scheduled" in a cell. */
const NO_DATE_CELL =
  /^(?:-{1,2}|—|–|=|~|optional|\(?\s*as per bor schedule\s*\)?|\(?\s*to be announced\s*\)?)$/i;

/** Month each column's term is centred on: Aug / Jan / Jun. */
const COLUMN_ANCHOR = [
  { month: 8, yearOffset: 0 },
  { month: 1, yearOffset: 1 },
  { month: 6, yearOffset: 1 },
] as const;

export type TermWindow = {
  startsOn: string;
  endsOn: string;
  finalsStartsOn: string;
  finalsEndsOn: string;
  changeOfMatriculationEndsOn: string;
};

/** The parser emits the first three; "holiday" comes from the holidays table. */
export type MilestoneKind = "deadline" | "period" | "milestone" | "holiday";

export type Milestone = {
  termId: number;
  label: string;
  kind: MilestoneKind;
  /** null when the registrar printed no date for this cell. */
  startsOn: string | null;
  endsOn: string | null;
};

export type Holiday = { label: string; startsOn: string };

export type AcademicCalendar = {
  schoolYear: string;
  terms: Record<string, TermWindow>;
  milestones: Milestone[];
  holidays: Holiday[];
};

export type TableRow = { label: string; cells: [string, string, string] };

/** Column centre of a token, used to derive the table's column geometry. */
function centreOf(line: string, token: string) {
  const index = line.indexOf(token);
  return index < 0 ? null : index + token.length / 2;
}

/**
 * Column boundaries from the "FIRST SEMESTER / SECOND SEMESTER / MIDYEAR"
 * header. Cells start left of their header token, so each column claims half
 * the gap to its neighbour.
 */
export function columnBoundaries(text: string): number[] {
  const header = text
    .split("\n")
    .find(
      (line) =>
        line.includes("FIRST SEMESTER") && line.includes("SECOND SEMESTER"),
    );
  if (!header) throw new Error("Column header row not found");

  const centres = ["FIRST SEMESTER", "SECOND SEMESTER", "MIDYEAR"].map(
    (token) => centreOf(header, token),
  );
  const [first, second, third] = centres;
  if (first == null || second == null || third == null) {
    throw new Error(`Incomplete column header: "${header.trim()}"`);
  }

  const half = (second - first) / 2;
  return [
    Math.round(first - half),
    Math.round((first + second) / 2),
    Math.round((second + third) / 2),
  ];
}

/**
 * Slice the milestone table into rows. A line with text in the label column
 * starts a row; a line with text only in the term columns continues the row
 * above it (that is how wrapped cells reach their own row).
 */
export function sliceTable(text: string): TableRow[] {
  const [labelEnd, firstEnd, secondEnd] = columnBoundaries(text);
  if (labelEnd == null || firstEnd == null || secondEnd == null) {
    throw new Error("Column boundaries not resolved");
  }

  const lines = text.split("\n");
  const headerIndex = lines.findIndex((line) =>
    line.includes("FIRST SEMESTER"),
  );
  // Footnotes ("* For the Midyear session…") and the holidays table below are
  // not milestone rows.
  const endIndex = lines.findIndex(
    (line, index) =>
      index > headerIndex &&
      (/^\s*\*+\s/.test(line) || line.includes("OFFICIAL HOLIDAYS")),
  );

  const body = lines.slice(
    headerIndex + 1,
    endIndex === -1 ? lines.length : endIndex,
  );

  const sliced = body.map((line) => ({
    indented:
      /^\s/.test(line.slice(0, labelEnd)) &&
      line.slice(0, labelEnd).trim() !== "",
    label: line.slice(0, labelEnd).trim(),
    cells: [
      line.slice(labelEnd, firstEnd).trim(),
      line.slice(firstEnd, secondEnd).trim(),
      line.slice(secondEnd).trim(),
    ] as [string, string, string],
  }));

  /**
   * These tables are vertically centred, so a wrapped cell can print *above*
   * its own label. The giveaway is the label line continuing a range with a
   * leading dash ("—18 Dec 2026"): then the orphan line above opened that
   * range and belongs to the row below, not the row above.
   */
  const belongsToNextRow = (index: number) => {
    for (let next = index + 1; next < sliced.length; next += 1) {
      const candidate = sliced[next];
      if (!candidate) return false;
      if (!candidate.label) continue;
      // "--" means "nothing scheduled", not an opened range.
      return candidate.cells.some(
        (cell) => !NO_DATE_CELL.test(cell) && /^[-–—]/.test(cell),
      );
    }
    return false;
  };

  const rows: TableRow[] = [];
  let heldOver: [string, string, string] | null = null;
  let heading = "";
  let headingUsed = false;

  for (const [index, line] of sliced.entries()) {
    const { label, cells, indented } = line;
    if (!label && cells.every((cell) => !cell)) continue;

    if (!label) {
      if (belongsToNextRow(index)) {
        heldOver = heldOver
          ? (heldOver.map((cell, column) =>
              `${cell} ${cells[column] ?? ""}`.trim(),
            ) as [string, string, string])
          : cells;
        continue;
      }
      const previous = rows.at(-1);
      if (!previous) continue;
      for (const column of [0, 1, 2] as const) {
        if (cells[column]) {
          previous.cells[column] =
            `${previous.cells[column]} ${cells[column]}`.trim();
        }
      }
      continue;
    }

    const merged: [string, string, string] = heldOver
      ? (heldOver.map((cell, column) =>
          `${cell} ${cells[column] ?? ""}`.trim(),
        ) as [string, string, string])
      : cells;
    heldOver = null;

    if (merged.every((cell) => !cell)) {
      // A dateless unindented line is a section heading for the sub-rows under
      // it ("MEDICAL EXAMINATION", "Deadline for filing application for…").
      // Consecutive dateless lines are one wrapped heading; a heading that has
      // already been used by a sub-row is finished, so start a new one.
      if (!indented) {
        heading = heading && !headingUsed ? `${heading} ${label}` : label;
        headingUsed = false;
      }
      continue;
    }

    // ponytail: sub-rows take the heading; unindented rows keep their own line
    // verbatim, so an OCR-split label ("registrants, non-degree/…") stays a
    // fragment in the data. Cosmetic only — the UI maps the rows it surfaces
    // to display names, and dates are unaffected.
    rows.push({
      label: indented && heading ? `${heading} — ${label}` : label,
      cells: merged,
    });
    if (indented && heading) headingUsed = true;
    if (!indented) {
      heading = "";
      headingUsed = false;
    }
  }
  return rows;
}

/** The year that puts `month` closest to its column's anchor month. */
function resolveYear(month: number, column: number, ayStartYear: number) {
  const anchor = COLUMN_ANCHOR[column];
  if (!anchor) throw new Error(`Unknown column ${column}`);
  const anchorYear = ayStartYear + anchor.yearOffset;
  const distance = (year: number) =>
    Math.abs((year - anchorYear) * 12 + month - anchor.month);
  return distance(anchorYear) <= distance(anchorYear - 1)
    ? anchorYear
    : anchorYear - 1;
}

/**
 * Dates in one cell. "03 Aug, Mon" / "01 Dec, Tue —07 Dec, Mon" /
 * "27 Nov 2026, Fri"; returns null when the registrar scheduled nothing.
 */
export function parseCell(
  cell: string,
  column: number,
  ayStartYear: number,
): { startsOn: string; endsOn: string } | null {
  const trimmed = cell.trim();
  if (!trimmed || NO_DATE_CELL.test(trimmed)) return null;

  const dates: string[] = [];
  for (const match of trimmed.matchAll(
    /(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s*(\d{4})?/g,
  )) {
    const day = match[1]?.padStart(2, "0");
    const month = MONTHS[(match[2] ?? "").slice(0, 3).toLowerCase()];
    if (!day || !month) continue;
    const explicitYear = match[3] ? Number(match[3]) : null;
    const year =
      explicitYear ?? resolveYear(Number(month), column, ayStartYear);
    dates.push(`${year}-${month}-${day}`);
  }
  if (dates.length === 0) return null;

  const startsOn = dates[0];
  let endsOn = dates[dates.length - 1];
  if (!startsOn || !endsOn) return null;
  if (endsOn < startsOn) {
    // A range that crosses new year ("23 Dec — 01 Jan") when neither cell
    // printed a year.
    const [year, rest] = [endsOn.slice(0, 4), endsOn.slice(4)];
    endsOn = `${Number(year) + 1}${rest}`;
  }
  return { startsOn, endsOn };
}

function kindOf(label: string, window: { startsOn: string; endsOn: string }) {
  if (/deadline|last day/i.test(label)) return "deadline" as const;
  return window.startsOn === window.endsOn
    ? ("milestone" as const)
    : ("period" as const);
}

/** CRS ids are 12<AY start year - 2020><1|2|3>; 1261/1262/1263 for 2026-2027. */
export function termIdFor(ayStartYear: number, column: number) {
  // ponytail: breaks in 2030, same as the id scheme itself; revisit with the
  // registrar then.
  return Number(`12${ayStartYear - 2020}${column + 1}`);
}

function findRow(rows: TableRow[], pattern: RegExp) {
  return rows.find((row) => pattern.test(row.label));
}

/**
 * Per-term sanity: registration cannot follow finals, finals cannot precede
 * the start of classes. Throws — a silently reordered calendar is worse than
 * no calendar.
 */
function assertOrder(termId: number, ordered: (string | null | undefined)[]) {
  const dates = ordered.filter((date): date is string => Boolean(date));
  for (let index = 1; index < dates.length; index += 1) {
    const previous = dates[index - 1];
    const current = dates[index];
    if (previous && current && previous > current) {
      throw new Error(
        `Term ${termId}: dates out of order (${previous} then ${current})`,
      );
    }
  }
}

/** Official holidays table under the milestone table (dated rows only). */
export function parseHolidays(text: string): Holiday[] {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.includes("OFFICIAL HOLIDAYS"));
  if (start === -1) return [];

  const holidays: Holiday[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^\s*\*+/.test(line)) break;
    // "Friday   21 August   Ninoy Aquino Day" — twice per line (two years).
    for (const match of line.matchAll(
      /([A-Z][a-z]+day)\s+(\d{1,2})\s+([A-Za-z]+)\s+(.+?)(?=\s{3,}[A-Z][a-z]+day\s|\s*$)/g,
    )) {
      const day = match[2]?.padStart(2, "0");
      const month = MONTHS[(match[3] ?? "").slice(0, 3).toLowerCase()];
      // pdftotext drops the tilde ("Los Banos Day"); restore the place name.
      const label = match[4]?.trim().replace(/\bLos Banos\b/g, "Los Baños");
      if (!day || !month || !label) continue;
      holidays.push({ label, startsOn: `${day}-${month}` });
    }
  }
  return holidays;
}

/**
 * Attach the calendar year to holiday rows. The table prints two year columns
 * (AY start year, then the next); a holiday belongs to the first year when its
 * month is Aug-Dec.
 */
function datedHolidays(text: string, ayStartYear: number): Holiday[] {
  return parseHolidays(text).map(({ label, startsOn }) => {
    const [day, month] = startsOn.split("-");
    const year = Number(month) >= 8 ? ayStartYear : ayStartYear + 1;
    return { label, startsOn: `${year}-${month}-${day}` };
  });
}

export function parseAcademicCalendar(text: string): AcademicCalendar {
  const ay = text.match(/ACADEMIC CALENDAR\s+(\d{4})\s*[-–—]\s*(\d{4})/);
  const ayStartYear = Number(ay?.[1]);
  if (!ayStartYear) throw new Error("AY not found in PDF title");
  const schoolYear = `${ay?.[1]}-${ay?.[2]}`;

  const rows = sliceTable(text);
  const milestones: Milestone[] = [];
  for (const row of rows) {
    for (const column of [0, 1, 2] as const) {
      const cell = row.cells[column];
      const window = parseCell(cell, column, ayStartYear);
      if (!window) continue;
      milestones.push({
        termId: termIdFor(ayStartYear, column),
        label: row.label,
        kind: kindOf(row.label, window),
        startsOn: window.startsOn,
        endsOn: window.endsOn,
      });
    }
  }

  const startOfClasses = findRow(rows, /^START OF CLASSES/i);
  const finals = findRow(rows, /^FINAL EXAMINATIONS/i);
  const changeOfMatric = findRow(rows, /^Change of Matriculation/i);
  if (!startOfClasses || !finals || !changeOfMatric) {
    throw new Error(
      "Missing a required row (START OF CLASSES / FINAL EXAMINATIONS / Change of Matriculation)",
    );
  }

  const terms: Record<string, TermWindow> = {};
  for (const column of [0, 1, 2] as const) {
    const termId = termIdFor(ayStartYear, column);
    const start = parseCell(startOfClasses.cells[column], column, ayStartYear);
    const finalsWindow = parseCell(finals.cells[column], column, ayStartYear);
    const matric = parseCell(changeOfMatric.cells[column], column, ayStartYear);
    if (!start || !finalsWindow || !matric) {
      throw new Error(`Incomplete dates for term ${termId}`);
    }
    assertOrder(termId, [
      start.startsOn,
      matric.endsOn,
      finalsWindow.startsOn,
      finalsWindow.endsOn,
    ]);
    terms[String(termId)] = {
      startsOn: start.startsOn,
      // The sem is over when finals end; the calendar has no student-facing
      // "end of term" row (END OF CLASSES precedes finals).
      endsOn: finalsWindow.endsOn,
      finalsStartsOn: finalsWindow.startsOn,
      finalsEndsOn: finalsWindow.endsOn,
      changeOfMatriculationEndsOn: matric.endsOn,
    };
  }

  return {
    schoolYear,
    terms,
    milestones,
    holidays: datedHolidays(text, ayStartYear),
  };
}
