/**
 * Extract an OUR "Schedule of Final Examinations" PDF into the
 * data/final-exams-{termId}.json format consumed by import:final-exams.
 *
 * The registrar PDF layout is stable across terms: one table page per
 * (exam day × time slot), rows are `COURSE CODE  ROOM[, ROOM…]`, and the
 * slot time (e.g. "2:00 - 4:00") is printed once per page.
 *
 * Source PDFs live in data/registrar/ (final-exams-{AY}-{sem}.pdf).
 *
 * Usage:
 *   bun run scripts/extract-final-exams-pdf.ts data/registrar/final-exams-2025-2026-1st-sem.pdf --term-id 1251 --source our-finals-pdf
 *
 * Requires `pdftotext` (poppler-utils) on PATH.
 */

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

type ExamRow = {
  course_code: string;
  room_code: string | null;
  exam_date: string;
  starts_at: string;
  ends_at: string;
};

const MONTHS: Record<string, string> = {
  JANUARY: "01",
  FEBRUARY: "02",
  MARCH: "03",
  APRIL: "04",
  MAY: "05",
  JUNE: "06",
  JULY: "07",
  AUGUST: "08",
  SEPTEMBER: "09",
  OCTOBER: "10",
  NOVEMBER: "11",
  DECEMBER: "12",
};

// "FRIDAY, DECEMBER 05 (FIRST DAY)" or "FRIDAY, 05 DECEMBER 2025"
const DAY_HEADER =
  /^(?:MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY),\s*(?:([A-Z]+)\s+(\d{1,2})|(\d{1,2})\s+([A-Z]+))/;
// Trailing meridiem appears from AY 2023-2024 midyear onward: "7:00 - 9:00 AM",
// "10:00 - 12:00 NOON", "2:00 - 4:00 pm", "7:00-9:00 a.m".
const SLOT =
  /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\s*(A\.?M\.?|P\.?M\.?|NOON|NN)?\s*$/i;
// "AAE 151", "APHY 10.1", "ChE 32", "SCIENCE 10". A trailing letter after the
// number ("RINR 271A") marks a wrapped room line, not a course.
const COURSE_ROW = /^([A-Z][A-Za-z]{1,7}\s+\d+(?:\.\d+)?)(?:\s{2,}(.*))?$/;
const NOISE =
  /^(Subject\b|All section\b|NO FINAL EXAMINATION|EXAMINATION BY ARRANGEMENT|Department of Human Kinetics|UNIVERSITY OF|OFFICE OF)/i;

/** Slots print a trailing meridiem in newer PDFs; without one, afternoon
 *  hours appear as 1–6. */
function to24h(hour: number, minute: number, meridiem?: string): string {
  const m = meridiem?.replace(/\./g, "").toUpperCase();
  let h = hour;
  if (m?.startsWith("P")) h = hour === 12 ? 12 : hour + 12;
  else if (m?.startsWith("A")) h = hour;
  else h = hour >= 1 && hour <= 6 ? hour + 12 : hour;
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseArgs(argv: string[]) {
  const pdf = argv.find((a) => !a.startsWith("--"));
  let termId: number | null = null;
  let source: string | null = null;
  let year: number | null = null;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--term-id") termId = Number(argv[++i]);
    if (argv[i] === "--source") source = argv[++i] ?? null;
    if (argv[i] === "--year") year = Number(argv[++i]);
  }
  if (!pdf || !termId || !Number.isFinite(termId) || !source) {
    console.error(
      "Usage: bun run scripts/extract-final-exams-pdf.ts <pdf> --term-id <id> --source <slug> [--year <exam year>]",
    );
    process.exit(1);
  }
  return { pdf, termId, source, year };
}

const {
  pdf,
  termId,
  source,
  year: yearFlag,
} = parseArgs(process.argv.slice(2));

const text = execFileSync("pdftotext", ["-layout", pdf, "-"], {
  encoding: "utf8",
});
const lines = text.split(/\r?\n/);

// Exam year: from the cover "FRIDAY, 05 DECEMBER 2025" line unless overridden.
const coverYear = text.match(/,\s*\d{1,2}\s+[A-Z]+\s+(\d{4})/)?.[1];
const year = yearFlag ?? (coverYear ? Number(coverYear) : null);
if (!year) {
  console.error("Could not detect exam year; pass --year.");
  process.exit(1);
}

type PendingRow = { courseCode: string; rooms: string };
let currentDate: string | null = null;
let block: PendingRow[] = [];
let blockSlot: { starts: string; ends: string } | null = null;
const exams: ExamRow[] = [];
const skipped: string[] = [];

/** Split a room cell on commas that are not inside parentheses. */
function splitRooms(cell: string): (string | null)[] {
  const cleaned = cell.trim();
  if (!cleaned) return [null];
  const rooms: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of cleaned) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      if (current.trim()) rooms.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) rooms.push(current.trim());
  return rooms.length > 0 ? rooms : [null];
}

function flushBlock() {
  if (block.length === 0) return;
  if (!currentDate || !blockSlot) {
    skipped.push(
      `Dropped ${block.length} rows: missing ${currentDate ? "time slot" : "date"}`,
    );
    block = [];
    blockSlot = null;
    return;
  }
  for (const row of block) {
    for (const room of splitRooms(row.rooms)) {
      exams.push({
        course_code: row.courseCode,
        room_code: room,
        exam_date: currentDate,
        starts_at: blockSlot.starts,
        ends_at: blockSlot.ends,
      });
    }
  }
  block = [];
  blockSlot = null;
}

for (const rawLine of lines) {
  const line = rawLine.trim();
  if (!line) continue;

  const header = line.match(DAY_HEADER);
  if (header) {
    const continued = /continued/i.test(line);
    // A new page shares the slot only when it's "- continued" AND the slot
    // hasn't printed yet; registrar prints one slot per page, so flush first.
    flushBlock();
    const monthName = header[1] ?? header[4];
    const day = header[2] ?? header[3];
    const month = MONTHS[monthName];
    if (month && !continued) {
      currentDate = `${year}-${month}-${day.padStart(2, "0")}`;
    } else if (month && continued) {
      currentDate = `${year}-${month}-${day.padStart(2, "0")}`;
    }
    continue;
  }

  if (NOISE.test(line)) continue;

  const slot = line.match(SLOT);
  const body = slot ? line.slice(0, slot.index).trimEnd() : line;
  if (slot) {
    // The meridiem describes the end time; "2:00 - 4:00 PM" is all-PM but a
    // cross-noon slot would overshoot the start, so pull it back 12h.
    let starts = to24h(Number(slot[1]), Number(slot[2]), slot[5]);
    const ends = to24h(Number(slot[3]), Number(slot[4]), slot[5]);
    if (starts > ends) {
      starts = `${String(Number(starts.slice(0, 2)) - 12).padStart(2, "0")}${starts.slice(2)}`;
    }
    blockSlot = { starts, ends };
  }

  if (!body) continue;

  const row = body.match(COURSE_ROW);
  if (row) {
    block.push({
      courseCode: row[1].replace(/\s+/g, " "),
      rooms: row[2] ?? "",
    });
  } else if (block.length > 0) {
    // Wrapped room-list continuation for the previous course.
    const prev = block[block.length - 1];
    prev.rooms = prev.rooms ? `${prev.rooms}, ${body}` : body;
  }
}
flushBlock();

if (exams.length === 0) {
  console.error("No exam rows parsed — check the PDF layout.");
  process.exit(1);
}

const outPath = join(
  import.meta.dir,
  "..",
  "data",
  `final-exams-${termId}.json`,
);
writeFileSync(
  outPath,
  `${JSON.stringify({ term_id: termId, source, exams }, null, 2)}\n`,
);

const dates = new Map<string, number>();
for (const exam of exams) {
  dates.set(
    `${exam.exam_date} ${exam.starts_at}-${exam.ends_at}`,
    (dates.get(`${exam.exam_date} ${exam.starts_at}-${exam.ends_at}`) ?? 0) + 1,
  );
}
console.log(`Wrote ${exams.length} exam rows to ${outPath}`);
for (const [key, count] of [...dates.entries()].sort()) {
  console.log(`  ${key}: ${count}`);
}
for (const warning of skipped) console.warn(warning);
