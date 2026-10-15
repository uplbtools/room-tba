import academicCalendar2024 from '#lib/data/academic-calendar-2024-2025.json';
import academicCalendar2026 from '#lib/data/academic-calendar-2026-2027.json';
import type { Milestone, MilestoneKind } from './academic-calendar-pdf';

/**
 * Registrar milestones for the calendar screen.
 *
 * The JSON stores every row the OUR calendar prints; this module decides which
 * of them a student sees. Rows that only concern staff (faculty/UC/BOR
 * meetings, tentative-list submissions) stay in the data and out of the UI —
 * flipping one on is an edit to SURFACED, not a re-parse.
 */

export type { Milestone, MilestoneKind } from './academic-calendar-pdf';

export type CalendarMilestone = {
	termId: number;
	/** Display name; the registrar's own wording, minus OCR wrapping. */
	label: string;
	kind: MilestoneKind;
	startsOn: string;
	endsOn: string;
};

/**
 * The student-planning subset, in the registrar's row order. First match wins,
 * so `display` also repairs labels the OCR split mid-sentence (GENERAL
 * REGISTRATION prints its dates on a wrapped continuation line).
 */
const SURFACED: { pattern: RegExp; display: string }[] = [
	{ pattern: /completion\/removal/i, display: 'Completion/removal exams' },
	{
		pattern: /^general registration|^registrants, non-degree/i,
		display: 'General registration'
	},
	{
		pattern: /waiver of prerequisite/i,
		display: 'Waiver of prerequisite deadline'
	},
	{ pattern: /^start of classes/i, display: 'Start of classes' },
	{ pattern: /^change of matriculation/i, display: 'Change of matriculation' },
	{
		pattern: /withdrawal of enlistment/i,
		display: 'Withdrawal of enlistment deadline'
	},
	{
		pattern: /application,? for graduation/i,
		display: 'Application for graduation deadline'
	},
	{ pattern: /^midsemester/i, display: 'Midsemester' },
	{ pattern: /^reading break/i, display: 'Reading break' },
	{ pattern: /^lenten break/i, display: 'Lenten break' },
	{ pattern: /dropping of subjects/i, display: 'Dropping deadline' },
	{ pattern: /leave of absence/i, display: 'Leave of absence deadline' },
	{ pattern: /^end of classes/i, display: 'End of classes' },
	{ pattern: /^integration period/i, display: 'Integration period' },
	{ pattern: /^final examinations/i, display: 'Final examinations' },
	{ pattern: /grade submission/i, display: 'Grade submission deadline' },
	{ pattern: /^christmas vacation/i, display: 'Christmas vacation' },
	{ pattern: /^uplb commencement/i, display: 'UPLB commencement' },
	{ pattern: /hooding ceremony/i, display: 'Graduate hooding ceremony' },
	{ pattern: /^uplb foundation day/i, display: 'UPLB Foundation Day' },
	{ pattern: /^loyalty day/i, display: 'Loyalty Day' }
];

const CALENDARS = [academicCalendar2024, academicCalendar2026];

/** A dateless milestone is never guessed onto the strip; the PDF had no date. */
function isDated(
	milestone: Milestone
): milestone is Milestone & { startsOn: string; endsOn: string } {
	return Boolean(milestone.startsOn && milestone.endsOn);
}

/**
 * Milestones to show for the given CRS term ids, chronological. Rows outside
 * SURFACED stay in the JSON and are skipped here.
 */
export function milestonesForTerms(termIds: number[]): CalendarMilestone[] {
	const wanted = new Set(termIds);
	const picked: CalendarMilestone[] = [];

	for (const calendar of CALENDARS) {
		for (const milestone of calendar.milestones as Milestone[]) {
			if (!wanted.has(milestone.termId) || !isDated(milestone)) continue;
			const match = SURFACED.find((entry) => entry.pattern.test(milestone.label));
			if (!match) continue;
			picked.push({
				termId: milestone.termId,
				label: match.display,
				kind: milestone.kind,
				startsOn: milestone.startsOn,
				endsOn: milestone.endsOn
			});
		}
	}

	return picked.sort((a, b) => a.startsOn.localeCompare(b.startsOn));
}

/**
 * Official holidays inside a date range (the year strip's own span), as
 * milestones so they render through the same path.
 */
export function holidaysWithin(rangeStart: string, rangeEnd: string): CalendarMilestone[] {
	const holidays: CalendarMilestone[] = [];
	for (const calendar of CALENDARS) {
		for (const holiday of calendar.holidays) {
			if (holiday.startsOn < rangeStart || holiday.startsOn > rangeEnd) continue;
			holidays.push({
				termId: 0,
				label: holiday.label,
				kind: 'holiday',
				startsOn: holiday.startsOn,
				endsOn: holiday.startsOn
			});
		}
	}
	return holidays.sort((a, b) => a.startsOn.localeCompare(b.startsOn));
}
