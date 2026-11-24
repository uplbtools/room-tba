import { describe, expect, it } from 'vitest';
import { freeTogether, sharedSections } from './friends.js';
import type { PlannedSection } from './types.js';

const section = (courseCode: string, schedule: string[], extra: Partial<PlannedSection> = {}) =>
	({
		courseCode,
		section: 'A',
		type: 'LEC',
		schedule,
		roomCode: null,
		courseTitle: null,
		...extra
	}) satisfies PlannedSection;

const monday = (people: PlannedSection[][], opts = {}) =>
	freeTogether(people, opts).filter((w) => w.dayIndex === 0);

describe('freeTogether', () => {
	it('returns the whole day for each weekday when nobody has class', () => {
		const windows = freeTogether([[], []]);
		expect(windows).toHaveLength(5);
		expect(windows[0]).toEqual({ dayIndex: 0, startMin: 420, endMin: 1140 });
	});

	it('merges overlapping classes from different people', () => {
		const ana = [section('CMSC 21', ['M 08:00AM-10:00AM'])];
		const ben = [section('MATH 27', ['M 09:00AM-11:00AM'])];
		expect(monday([ana, ben])).toEqual([
			{ dayIndex: 0, startMin: 420, endMin: 480 },
			{ dayIndex: 0, startMin: 660, endMin: 1140 }
		]);
	});

	it('drops gaps shorter than the minimum and back-to-back classes', () => {
		const ana = [
			section('CMSC 21', ['M 07:00AM-10:00AM']),
			section('CMSC 22', ['M 10:00AM-12:00PM']),
			section('CMSC 56', ['M 12:15PM-07:00PM'])
		];
		expect(monday([ana])).toEqual([]);
	});

	it('ignores TBA and stale sections', () => {
		const ana = [
			section('CMSC 190', ['TBA']),
			section('CMSC 21', ['M 08:00AM-06:00PM'], { stale: true })
		];
		expect(monday([ana])).toEqual([{ dayIndex: 0, startMin: 420, endMin: 1140 }]);
	});

	it('includes Saturday only when someone has a Saturday class', () => {
		const ana = [section('HK 12', ['S 07:00AM-09:00AM'])];
		const saturday = freeTogether([ana]).filter((w) => w.dayIndex === 5);
		expect(saturday).toEqual([{ dayIndex: 5, startMin: 540, endMin: 1140 }]);
	});
});

describe('sharedSections', () => {
	it('lists sections two or more people share, with who', () => {
		const shared = sharedSections([
			{ name: 'Ana', sections: [section('CMSC 21', ['M 08:00AM-10:00AM'])] },
			{ name: 'Ben', sections: [section('CMSC 21', ['M 08:00AM-10:00AM'])] },
			{ name: 'Cy', sections: [section('CMSC 21', ['T 08:00AM-10:00AM'], { section: 'B' })] }
		]);
		expect(shared).toHaveLength(1);
		expect(shared[0]).toMatchObject({ courseCode: 'CMSC 21', section: 'A', names: ['Ana', 'Ben'] });
	});
});
