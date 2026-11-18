import { describe, expect, it } from 'vitest';
import { findSchedules, type ScheduleFilters } from './find-schedule.js';
import type { ClassMapValue } from '#lib/utils/types.js';

let nextId = 1;
function row(over: Partial<ClassMapValue>): ClassMapValue {
	return {
		courseCode: 'CMSC 123',
		roomCode: null,
		section: 'A',
		type: 'LEC',
		schedule: ['MW 08:00AM-09:00AM'],
		directions: null,
		courseTitle: null,
		roomId: null,
		termId: 1,
		id: nextId++,
		...over
	};
}

const none: ScheduleFilters = {
	notBefore: null,
	freeDay: null,
	lunch: null,
	walkMinutes: null
};

describe('findSchedules', () => {
	const rows = [
		row({ courseCode: 'A 1', section: 'X', schedule: ['MW 08:00AM-09:00AM'] }),
		row({ courseCode: 'A 1', section: 'Y', schedule: ['TTh 08:00AM-09:00AM'] }),
		row({ courseCode: 'B 2', section: 'X', schedule: ['MW 08:30AM-09:30AM'] }),
		row({ courseCode: 'B 2', section: 'Y', schedule: ['TTh 10:00AM-11:00AM'] })
	];

	it('lists only combinations without a time overlap', () => {
		const { schedules } = findSchedules(rows, ['A 1', 'B 2'], none);
		const picks = schedules.map((s) => s.offerings.map((o) => o.section));
		expect(picks).toHaveLength(3);
		expect(picks).not.toContainEqual(['X', 'X']);
	});

	it('returns nothing when every combination overlaps', () => {
		const clash = [
			row({ courseCode: 'A 1', section: 'X' }),
			row({ courseCode: 'B 2', section: 'X' })
		];
		expect(findSchedules(clash, ['A 1', 'B 2'], none).schedules).toEqual([]);
	});

	it('keeps a lecture and its lab together and checks both for overlap', () => {
		const withLab = [
			row({ courseCode: 'A 1', section: 'S', schedule: ['M 08:00AM-09:00AM'] }),
			row({
				courseCode: 'A 1',
				section: 'S-1L',
				type: 'LAB',
				schedule: ['F 01:00PM-04:00PM']
			}),
			row({ courseCode: 'B 2', section: 'X', schedule: ['F 02:00PM-03:00PM'] }),
			row({ courseCode: 'B 2', section: 'Y', schedule: ['T 02:00PM-03:00PM'] })
		];
		const { schedules } = findSchedules(withLab, ['A 1', 'B 2'], none);
		expect(schedules).toHaveLength(1);
		expect(schedules[0].offerings[0].sections.map((r) => r.type)).toEqual(['LEC', 'LAB']);
		expect(schedules[0].offerings[1].section).toBe('Y');
	});

	it('ranks a schedule that meets the filter above one that breaks it', () => {
		const early = [
			row({ courseCode: 'A 1', section: 'X', schedule: ['M 07:00AM-08:00AM'] }),
			row({ courseCode: 'A 1', section: 'Y', schedule: ['M 10:00AM-11:00AM'] })
		];
		const { schedules } = findSchedules(early, ['A 1'], {
			...none,
			notBefore: 9 * 60
		});
		expect(schedules.map((s) => [s.offerings[0].section, s.violations])).toEqual([
			['Y', 0],
			['X', 1]
		]);
	});

	it('counts a class inside the lunch window as a violation', () => {
		const lunchRows = [
			row({ courseCode: 'A 1', section: 'X', schedule: ['M 11:00AM-12:00PM'] }),
			row({ courseCode: 'A 1', section: 'Y', schedule: ['M 02:00PM-03:00PM'] })
		];
		const { schedules } = findSchedules(lunchRows, ['A 1'], {
			...none,
			lunch: { startMin: 11 * 60 + 30, endMin: 13 * 60 }
		});
		expect(schedules.map((s) => [s.offerings[0].section, s.violations])).toEqual([
			['Y', 0],
			['X', 1]
		]);
	});

	it('prefers a schedule that leaves a chosen weekday free', () => {
		const { schedules } = findSchedules(rows, ['A 1', 'B 2'], {
			...none,
			freeDay: 4
		});
		expect(schedules.every((s) => s.violations === 0)).toBe(true);
		const friday = findSchedules(
			[
				row({
					courseCode: 'A 1',
					section: 'X',
					schedule: ['F 08:00AM-09:00AM']
				})
			],
			['A 1'],
			{ ...none, freeDay: 4 }
		);
		expect(friday.schedules[0].violations).toBe(1);
	});

	it("flags back-to-back classes the walk can't make", () => {
		const tight = [
			row({
				courseCode: 'A 1',
				schedule: ['M 08:00AM-09:00AM'],
				roomCode: 'FAR 1'
			}),
			row({
				courseCode: 'B 2',
				schedule: ['M 09:05AM-10:00AM'],
				roomCode: 'FAR 2'
			})
		];
		const walk = (from: string, to: string) => (from === to ? 0 : 10);
		const { schedules } = findSchedules(tight, ['A 1', 'B 2'], {
			...none,
			walkMinutes: walk
		});
		expect(schedules[0].violations).toBe(1);
		const ok = findSchedules(tight, ['A 1', 'B 2'], {
			...none,
			walkMinutes: () => 3
		});
		expect(ok.schedules[0].violations).toBe(0);
	});

	it('ranks by early starts, then gaps, when filters tie', () => {
		const tie = [
			row({ courseCode: 'A 1', section: 'X', schedule: ['M 07:00AM-08:00AM'] }),
			row({ courseCode: 'A 1', section: 'Y', schedule: ['M 09:00AM-10:00AM'] }),
			row({ courseCode: 'B 2', section: 'X', schedule: ['M 10:00AM-11:00AM'] }),
			row({ courseCode: 'B 2', section: 'Y', schedule: ['M 01:00PM-02:00PM'] })
		];
		const { schedules } = findSchedules(tie, ['A 1', 'B 2'], none);
		expect(schedules[0].offerings.map((o) => o.section)).toEqual(['Y', 'X']);
		expect(schedules[0].gapMinutes).toBe(0);
	});

	it('names courses with no offering and stops at the result cap', () => {
		const many = Array.from({ length: 300 }, (_, i) =>
			row({ courseCode: 'A 1', section: `S${i}`, schedule: ['TBA'] })
		);
		const result = findSchedules(many, ['A 1', 'NOPE 1'], none);
		expect(result.missing).toEqual(['NOPE 1']);
		expect(result.schedules).toHaveLength(200);
		expect(result.capped).toBe(true);
	});
});
