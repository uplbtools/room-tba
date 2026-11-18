import { render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import TodayScreen from './TodayScreen.svelte';
import { getRoomWalkSeconds } from '#lib/functions/directions.remote.js';
import PlannerStore from '#lib/stores/new/data/PlannerStore.svelte.js';
import TermStore from '#lib/stores/new/data/TermStore.svelte.js';
import type { ClassMapValue } from '#lib/utils/types.js';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('#lib/functions/terms.remote.js', () => ({ getTerms: vi.fn() }));
vi.mock('#lib/functions/directions.remote.js', () => ({ getRoomWalkSeconds: vi.fn() }));
vi.mock('#lib/utils/context.js', () => ({
	getPlannerStore: () => plannerStore,
	getTermStore: () => termStore,
	getSearchInfo: () => ({})
}));

const termStore = new TermStore();
const plannerStore = new PlannerStore(() => termStore.activeTermId);

const row = (overrides: Partial<ClassMapValue>): ClassMapValue => ({
	id: 1,
	courseCode: 'CMSC 128',
	section: 'AB-1L',
	type: 'LEC',
	schedule: ['MW 07:00AM-08:00AM'],
	roomCode: 'ICS MH1',
	directions: null,
	courseTitle: 'Software Engineering',
	roomId: 1,
	termId: 1252,
	...overrides
});

describe('TodayScreen', () => {
	beforeEach(() => {
		// Only Date is faked: Svelte's scheduler still needs real timers.
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date('2026-07-27T04:00:00Z')); // Monday noon in Manila
		localStorage.clear();
		termStore.activeTermId = 1252;
		plannerStore.plans = [];
		plannerStore.activePlanIdByTerm = {};
		vi.mocked(getRoomWalkSeconds).mockReset();
	});

	afterEach(() => vi.useRealTimers());

	test('says when to leave for a class in another building', async () => {
		vi.mocked(getRoomWalkSeconds).mockResolvedValue(440);
		plannerStore.addOffering([
			row({ courseCode: 'MATH 27', roomCode: 'MB 101', schedule: ['M 07:00AM-08:00AM'] })
		]);
		plannerStore.addOffering([row({ id: 2, schedule: ['M 08:10AM-09:00AM'] })]);
		render(TodayScreen);

		expect(await screen.findByText('Leave by 8:02 AM, 8 min walk from MB 101')).toBeVisible();
		expect(getRoomWalkSeconds).toHaveBeenCalledWith({ from: 'MB 101', to: 'ICS MH1' });
	});

	test('says nothing when the rooms are in one building', async () => {
		vi.mocked(getRoomWalkSeconds).mockResolvedValue(null);
		plannerStore.addOffering([
			row({ courseCode: 'MATH 27', roomCode: 'MB 101', schedule: ['M 07:00AM-08:00AM'] })
		]);
		plannerStore.addOffering([row({ id: 2, roomCode: 'MB 102', schedule: ['M 08:10AM-09:00AM'] })]);
		render(TodayScreen);

		await vi.waitFor(() => expect(getRoomWalkSeconds).toHaveBeenCalled());
		expect(document.querySelector('.today-entry__leave')).toBeNull();
	});
});
