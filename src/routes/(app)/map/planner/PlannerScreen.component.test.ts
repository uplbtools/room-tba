import { render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import PlannerScreen from './PlannerScreen.svelte';
import { getClassesByCourseCode } from '#lib/functions/classes.remote.js';
import PlannerStore from '#lib/stores/new/data/PlannerStore.svelte.js';
import TermStore from '#lib/stores/new/data/TermStore.svelte.js';
import ToastStore from '#lib/stores/new/ui/ToastStore.svelte.js';
import type { ClassMapValue } from '#lib/utils/types';

vi.mock('#lib/functions/terms.remote.js', () => ({ getTerms: vi.fn() }));
vi.mock('#lib/functions/classes.remote.js', () => ({
	getClassesByCourseCode: vi.fn(async () => [])
}));
vi.mock('#lib/functions/final-exams.remote.js', () => ({ getFinalExams: vi.fn(async () => []) }));
vi.mock('#lib/utils/context.js', () => ({
	getPlannerStore: () => plannerStore,
	getTermStore: () => termStore,
	getToast: () => toastStore,
	getSearchInfo: () => ({}),
	getEscapeActions: () => ({})
}));

const termStore = new TermStore();
termStore.init = async () => {};
const plannerStore = new PlannerStore(() => termStore.activeTermId);
const toastStore = new ToastStore();

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

describe('PlannerScreen', () => {
	beforeEach(() => {
		localStorage.clear();
		termStore.activeTermId = 1252;
		plannerStore.plans = [];
		plannerStore.activePlanIdByTerm = {};
		vi.mocked(getClassesByCourseCode).mockClear();
	});

	test('renders as a dialog with course search and an empty grid', () => {
		render(PlannerScreen);
		expect(screen.getByRole('dialog')).toBeTruthy();
		expect(screen.getByPlaceholderText(/Search courses/i)).toBeVisible();
		expect(document.querySelector('.planner-grid')).toBeTruthy();
		expect(document.querySelectorAll('.planner-block')).toHaveLength(0);
	});

	test('renders grid blocks and section list for a seeded plan', async () => {
		const rows = [row({}), row({ id: 2, type: 'LAB', schedule: ['F 01:00PM-04:00PM'] })];
		vi.mocked(getClassesByCourseCode).mockImplementationOnce((async () => rows) as never);
		plannerStore.addOffering(rows);
		render(PlannerScreen);
		// MW LEC = 2 blocks + F LAB = 1 block
		await vi.waitFor(() => expect(document.querySelectorAll('.planner-block')).toHaveLength(3));
		// Sections list groups by course: a "CMSC 128" header + its parts.
		await vi.waitFor(() =>
			expect(document.querySelector('.planner-offering__course')?.textContent).toContain('CMSC 128')
		);
		expect(
			[...document.querySelectorAll('.planner-offering__part-section')].map((el) =>
				el.textContent?.trim()
			)
		).toContain('AB-1L');
		expect(screen.getByText('All clear')).toBeVisible();
	});

	test('shows conflict badge and outlines for overlapping sections', async () => {
		plannerStore.addOffering([row({})]);
		plannerStore.addOffering([
			row({
				id: 5,
				courseCode: 'MATH 27',
				section: 'B-2',
				schedule: ['M 07:30AM-08:30AM']
			})
		]);
		render(PlannerScreen);
		expect(await screen.findByText('1 conflict')).toBeVisible();
		expect(document.querySelectorAll('.planner-block--conflict').length).toBeGreaterThan(0);
	});

	test('lists TBA sections under Unscheduled', async () => {
		plannerStore.addOffering([row({ courseCode: 'PE 2', section: 'C-1', schedule: ['TBA'] })]);
		render(PlannerScreen);
		expect(await screen.findByText('Unscheduled (TBA)')).toBeVisible();
		expect(document.querySelectorAll('.planner-block')).toHaveLength(0);
	});

	// Regression (#506 drag-to-switch-section): drag targets come from the
	// section alternatives loaded on mount.
	test('loads section alternatives on mount so drag-to-switch has targets', async () => {
		plannerStore.addOffering([row({})]);
		render(PlannerScreen);
		await vi.waitFor(() => {
			expect(getClassesByCourseCode).toHaveBeenCalledWith(
				expect.objectContaining({ courseCode: 'CMSC 128' })
			);
		});
	});

	test('plan tabs switch between plans', async () => {
		plannerStore.addOffering([row({})]);
		plannerStore.createPlan();
		render(PlannerScreen);
		const tabs = screen.getAllByRole('tab');
		expect(tabs.map((t) => t.textContent?.trim())).toEqual(['Untitled Plan 1', 'Untitled Plan 2']);
	});
});
