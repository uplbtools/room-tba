/**
 * Extract the OUR "Academic Calendar" PDF into
 * data/academic-calendar-{schoolYear}.json, keyed by CRS term id and
 * consumed by src/lib/term-calendar.ts (finals windows, change-of-matric)
 * and by hand when writing the terms-table migration.
 *
 * The registrar calendar is one table: rows are milestones, columns are
 * 1st sem / 2nd sem / midyear. The rows we need are single lines whose
 * cells are separated by 2+ spaces. Dates print as "03 Aug, Mon" or
 * ranges "01 Dec, Tue —07 Dec, Mon" (em- or hyphen-dash), no year — the
 * year comes from the AY in the title (Aug–Dec = first year, Jan–Jul =
 * second year).
 *
 * Usage:
 *   bun run scripts/extract-academic-calendar-pdf.ts <pdf>
 *
 * Requires `pdftotext` (poppler-utils) on PATH.
 */

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const MONTHS: Record<string, string> = {
  JAN: "01",
  FEB: "02",
  MAR: "03",
  APR: "04",
  MAY: "05",
  JUN: "06",
  JUL: "07",
  AUG: "08",
  SEP: "09",
  OCT: "10",
  NOV: "11",
  DEC: "12",
};

type TermWindow = {
  startsOn: string;
  endsOn: string;
  finalsStartsOn: string;
  finalsEndsOn: string;
  changeOfMatriculationEndsOn: string;
};

/** Milestone rows we extract; each has one dated cell per term column. */
const ROWS = {
  startOfClasses: /^START OF CLASSES\s{2,}(.+)$/m,
  endOfClasses: /^END OF CLASSES\s{2,}(.+)$/m,
  finals: /^FINAL EXAMINATIONS\s{2,}(.+)$/m,
  changeOfMatric: /^Change of Matriculation Period\s{2,}(.+)$/m,
} as const;

/** "03 Aug" cells → ISO dates; ranges yield [first, last]. */
function parseCell(cell: string, ayStartYear: number): string[] {
  const dates: string[] = [];
  for (const match of cell.matchAll(/(\d{1,2})\s+([A-Za-z]{3,9})\b/g)) {
    const day = match[1]?.padStart(2, "0");
    const month = MONTHS[(match[2] ?? "").slice(0, 3).toUpperCase()];
    if (!day || !month) continue;
    // 1st sem runs Aug–Dec of the AY's first year; 2nd sem and midyear
    // run Jan–Jul of the second year.
    const year = Number(month) >= 8 ? ayStartYear : ayStartYear + 1;
    dates.push(`${year}-${month}-${day}`);
  }
  return dates;
}

function extractRow(
  text: string,
  pattern: RegExp,
  ayStartYear: number,
): string[][] {
  const line = text.match(pattern)?.[1];
  if (!line) throw new Error(`Row not found: ${pattern}`);
  const cells = line.trim().split(/\s{2,}/);
  if (cells.length !== 3) {
    throw new Error(`Expected 3 term columns, got ${cells.length}: "${line}"`);
  }
  return cells.map((cell) => {
    const dates = parseCell(cell, ayStartYear);
    if (dates.length === 0) throw new Error(`No date in cell: "${cell}"`);
    return dates;
  });
}

function extract(pdfPath: string) {
  const text = execFileSync("pdftotext", ["-layout", pdfPath, "-"], {
    encoding: "utf8",
  });

  const ay = text.match(/ACADEMIC CALENDAR (\d{4})-(\d{4})/);
  const ayStartYear = Number(ay?.[1]);
  if (!ayStartYear) throw new Error("AY not found in PDF title");
  const schoolYear = `${ay?.[1]}-${ay?.[2]}`;

  const starts = extractRow(text, ROWS.startOfClasses, ayStartYear);
  const finals = extractRow(text, ROWS.finals, ayStartYear);
  const matric = extractRow(text, ROWS.changeOfMatric, ayStartYear);

  const windows: Record<string, TermWindow> = {};
  for (let column = 0; column < 3; column++) {
    // CRS term ids are 12<AY start year - 2020><1|2|3 = 1st/2nd/midyear>,
    // e.g. AY 2026-2027 → 1261/1262/1263.
    // ponytail: breaks in 2030; revisit the id scheme with the registrar then.
    const termId = `12${ayStartYear - 2020}${column + 1}`;
    const startsOn = starts[column]?.[0];
    const finalsDates = finals[column] ?? [];
    const finalsStartsOn = finalsDates[0];
    const finalsEndsOn = finalsDates[finalsDates.length - 1];
    const matricDates = matric[column] ?? [];
    const matricEndsOn = matricDates[matricDates.length - 1];
    if (!startsOn || !finalsStartsOn || !finalsEndsOn || !matricEndsOn) {
      throw new Error(`Incomplete dates for term ${termId}`);
    }
    if (!(startsOn <= matricEndsOn && matricEndsOn < finalsStartsOn)) {
      throw new Error(`Dates out of order for term ${termId}`);
    }
    windows[termId] = {
      startsOn,
      // The sem is over when finals end; the calendar has no student-facing
      // "end of term" row (END OF CLASSES precedes finals).
      endsOn: finalsEndsOn,
      finalsStartsOn,
      finalsEndsOn,
      changeOfMatriculationEndsOn: matricEndsOn,
    };
  }
  return { schoolYear, windows };
}

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error(
    "Usage: bun run scripts/extract-academic-calendar-pdf.ts <pdf>",
  );
  process.exit(1);
}

const { schoolYear, windows } = extract(pdfPath);
const outPath = join("data", `academic-calendar-${schoolYear}.json`);
writeFileSync(outPath, `${JSON.stringify(windows, null, 2)}\n`);
console.log(`Wrote ${outPath}`);
console.log(JSON.stringify(windows, null, 2));
