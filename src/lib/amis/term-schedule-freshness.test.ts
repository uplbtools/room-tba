import { describe, expect, test } from 'vitest';
import { classesScheduleFreshnessMessage } from './term-schedule-freshness.js';

const com = { startsOn: '2026-08-17', endsOn: '2026-08-21' };
const at = (day: string) => new Date(`${day}T04:00:00Z`).getTime();

describe('classesScheduleFreshnessMessage', () => {
	test('names the COM dates while it is under way', () => {
		const message = classesScheduleFreshnessMessage('2026-08-16T04:00:00Z', at('2026-08-18'), com);
		expect(message).toContain('Change of matriculation (COM) is under way');
	});

	test('warns when the import predates the end of COM', () => {
		const message = classesScheduleFreshnessMessage('2026-08-19T04:00:00Z', at('2026-08-25'), com);
		expect(message).toContain('before this semester');
	});

	test('says nothing about COM without a period', () => {
		const message = classesScheduleFreshnessMessage('2026-08-19T04:00:00Z', at('2026-08-25'));
		expect(message).not.toContain('COM');
	});
});
