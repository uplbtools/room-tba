import { describe, expect, it } from 'vitest';
import { buildAgenda, formatTimeRange, leaveByNote } from './today-agenda.js';
import type { PlannedSection } from './types.js';

const section = (overrides: Partial<PlannedSection> = {}): PlannedSection => ({
	courseCode: 'CMSC 128',
	section: 'AB-1L',
	type: 'LEC',
	schedule: ['MW 07:00AM-08:00AM'],
	roomCode: 'ICS MH1',
	courseTitle: 'Software Engineering',
	...overrides
});

// 2026-07-27 is a Monday in Manila.
const MONDAY_NOON_MANILA = new Date('2026-07-27T04:00:00Z');

describe('buildAgenda', () => {
	it('buckets today and tomorrow from the Manila calendar day', () => {
		const days = buildAgenda(
			[
				section(),
				section({
					courseCode: 'MATH 27',
					section: 'B-2',
					type: 'LEC',
					schedule: ['TTh 10:00AM-11:30AM'],
					roomCode: 'MB 101'
				})
			],
			{ now: MONDAY_NOON_MANILA }
		);

		expect(days).toHaveLength(7);
		expect(days[0].title).toBe('Today');
		expect(days[0].dateKey).toBe('2026-07-27');
		expect(days[0].entries.map((e) => e.courseCode)).toEqual(['CMSC 128']);

		expect(days[1].title).toBe('Tomorrow');
		expect(days[1].dateKey).toBe('2026-07-28');
		expect(days[1].entries.map((e) => e.courseCode)).toEqual(['MATH 27']);

		// Wednesday carries the second half of the MW lecture.
		expect(days[2].title).toBe('Wednesday');
		expect(days[2].entries.map((e) => e.courseCode)).toEqual(['CMSC 128']);
	});

	it("orders a day's classes by start time", () => {
		const [today] = buildAgenda(
			[
				section({ courseCode: 'PE 2', schedule: ['M 03:00PM-05:00PM'] }),
				section({ courseCode: 'CMSC 128', schedule: ['M 07:00AM-08:00AM'] }),
				section({ courseCode: 'BIO 30', schedule: ['M 10:00AM-11:00AM'] })
			],
			{ now: MONDAY_NOON_MANILA, days: 1 }
		);

		expect(today.entries.map((e) => e.courseCode)).toEqual(['CMSC 128', 'BIO 30', 'PE 2']);
		expect(today.entries[0].timeLabel).toBe('7:00 AM – 8:00 AM');
		expect(today.entries[2].timeLabel).toBe('3:00 PM – 5:00 PM');
	});

	it('rolls over at the Manila day boundary, not UTC', () => {
		// 2026-07-27T17:00Z is already Tuesday 01:00 in Manila (UTC+8).
		const [today] = buildAgenda([section()], {
			now: new Date('2026-07-27T17:00:00Z'),
			days: 1
		});
		expect(today.dateKey).toBe('2026-07-28');

		// One minute before Manila midnight it is still Monday.
		const [stillMonday] = buildAgenda([section()], {
			now: new Date('2026-07-27T15:59:00Z'),
			days: 1
		});
		expect(stillMonday.dateKey).toBe('2026-07-27');
		expect(stillMonday.entries).toHaveLength(1);
	});

	it('marks the weekend and never schedules Sunday', () => {
		const days = buildAgenda([section({ schedule: ['TThS 08:00AM-09:00AM'] })], {
			now: MONDAY_NOON_MANILA
		});
		const saturday = days.find((day) => day.dateKey === '2026-08-01');
		const sunday = days.find((day) => day.dateKey === '2026-08-02');

		expect(saturday?.isWeekend).toBe(true);
		expect(saturday?.dayIndex).toBe(5);
		expect(saturday?.entries).toHaveLength(1);

		expect(sunday?.isWeekend).toBe(true);
		expect(sunday?.dayIndex).toBeNull();
		expect(sunday?.entries).toHaveLength(0);
		expect(sunday?.emptyLabel).toBe('No classes on Sundays.');

		expect(days[0].isWeekend).toBe(false);
	});

	it('returns empty days for an empty plan', () => {
		const days = buildAgenda([], { now: MONDAY_NOON_MANILA });
		expect(days).toHaveLength(7);
		expect(days.every((day) => day.entries.length === 0)).toBe(true);
		expect(days[0].emptyLabel).toBe('No classes today.');
		expect(days[2].emptyLabel).toBe('No classes.');
	});

	it('skips stale and TBA sections', () => {
		const days = buildAgenda(
			[section({ stale: true }), section({ courseCode: 'HIST 1', schedule: ['TBA'] })],
			{ now: MONDAY_NOON_MANILA }
		);
		expect(days.every((day) => day.entries.length === 0)).toBe(true);
	});
});

describe('formatTimeRange', () => {
	it('formats noon and midnight without a zero hour', () => {
		expect(formatTimeRange(0, 30)).toBe('12:00 AM – 12:30 AM');
		expect(formatTimeRange(720, 780)).toBe('12:00 PM – 1:00 PM');
	});
});

describe('leaveByNote', () => {
	it('says when to leave when the gap is longer than the walk', () => {
		expect(leaveByNote(750, 780, 8, 'PS C-203')).toBe(
			'Leave by 12:52 PM, 8 min walk from PS C-203'
		);
	});

	it("says how late you'll be when the walk is longer than the gap", () => {
		expect(leaveByNote(777, 780, 8, 'PS C-203')).toBe(
			"8 min walk from PS C-203, so you'll be about 5 min late"
		);
	});
});
