/**
 * Extract the OUR "Academic Calendar" PDF into
 * data/academic-calendar-{schoolYear}.json: term windows (consumed by
 * src/lib/term-calendar.ts) plus every milestone row and official holiday.
 *
 * Parsing lives in src/lib/academic-calendar-pdf.ts so it is unit-tested;
 * this script is only pdftotext in, JSON out.
 *
 * Source PDFs live in data/registrar/ (academic-calendar-{AY}.pdf). The
 * AY 2025-2026 PDF has no text layer (image-only scan) and cannot be
 * extracted — that year has no milestones until someone supplies a
 * text-layer PDF or a verified transcription. Do not hand-type it.
 *
 * Usage:
 *   bun run scripts/extract-academic-calendar-pdf.ts data/registrar/academic-calendar-2026-2027.pdf
 *
 * Requires `pdftotext` (poppler-utils) on PATH.
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseAcademicCalendar } from '../src/lib/academic-calendar-pdf';

const pdfPath = process.argv[2];
if (!pdfPath) {
	console.error('Usage: bun run scripts/extract-academic-calendar-pdf.ts <pdf>');
	process.exit(1);
}

const text = execFileSync('pdftotext', ['-layout', pdfPath, '-'], {
	encoding: 'utf8'
});
if (text.trim().length < 500) {
	console.error(
		`${pdfPath} has no usable text layer (${text.trim().length} chars). ` +
			'It is an image-only scan; transcribe it by hand and review it against ' +
			'the PDF rather than guessing dates.'
	);
	process.exit(1);
}

const { schoolYear, terms, milestones, holidays } = parseAcademicCalendar(text);
const outPath = join('data', `academic-calendar-${schoolYear}.json`);
writeFileSync(outPath, `${JSON.stringify({ terms, milestones, holidays }, null, 2)}\n`);
console.log(
	`Wrote ${outPath}: ${Object.keys(terms).length} terms, ${milestones.length} milestones, ${holidays.length} holidays`
);
console.log(JSON.stringify(terms, null, 2));
