import { describe, expect, test } from 'vitest';
import {
	EMERGENCY_HOTLINE_CATEGORIES,
	emergencyHotlineTel,
	formatHotlineNumber
} from './emergency-hotlines';

describe('emergency hotlines', () => {
	test('keeps every category and contact callable, urgent lines first', () => {
		expect(EMERGENCY_HOTLINE_CATEGORIES.map(({ name }) => name)).toEqual([
			'National',
			'Medical',
			'University',
			'Local',
			'Student-led'
		]);

		for (const { entries } of EMERGENCY_HOTLINE_CATEGORIES) {
			expect(entries.length).toBeGreaterThan(0);
			for (const entry of entries) {
				expect(entry.name).not.toBe('');
				expect(entry.numbers.length).toBeGreaterThan(0);
			}
		}
	});

	test('normalizes Philippine mobile and landline numbers for tel links', () => {
		expect(emergencyHotlineTel('0961 396 3441')).toBe('tel:+639613963441');
		expect(emergencyHotlineTel('(049) 536 7965')).toBe('tel:+63495367965');
		expect(emergencyHotlineTel('911')).toBe('tel:911');
	});

	test('formats every number one way for display', () => {
		expect(formatHotlineNumber('(049) 536-3247')).toBe('(049) 536 3247');
		expect(formatHotlineNumber('(049) 536 7965')).toBe('(049) 536 7965');
		expect(formatHotlineNumber('0961 396 3441')).toBe('0961 396 3441');
		expect(formatHotlineNumber('911')).toBe('911');
	});
});
