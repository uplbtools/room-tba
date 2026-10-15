import { describe, expect, test } from 'vitest';
import { plannerRoomCodes } from './normalize';

describe('plannerRoomCodes', () => {
	test('normalizes, dedupes, and drops TBA (null) rooms', () => {
		expect(
			plannerRoomCodes([
				{ roomCode: 'icb 12' },
				{ roomCode: 'ICB 12' },
				{ roomCode: ' PSLH-A ' },
				{ roomCode: null },
				{ roomCode: '' }
			])
		).toEqual(['ICB 12', 'PSLH-A']);
	});

	test('empty plan yields no codes', () => {
		expect(plannerRoomCodes([])).toEqual([]);
	});
});
