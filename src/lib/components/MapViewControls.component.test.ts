import { render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, test } from 'vitest';
import MapViewControls from './MapViewControls.svelte';
import { map, plannerStore, termStore } from '$lib/stores.svelte';
import { mountAtWidth } from '@test/layout-assertions';

describe('MapViewControls My classes toggle', () => {
	beforeEach(() => {
		localStorage.clear();
		plannerStore.plans = [];
		plannerStore.activePlanIdByTerm = {};
		map.showAll();
	});

	test('disabled with a hint when the planner has no classes at 320px', () => {
		mountAtWidth(320);
		render(MapViewControls, { props: { embedded: true, variant: 'modes' } });

		const toggle = screen.getByRole('button', {
			name: /Add classes in the Planner/
		}) as HTMLButtonElement;
		expect(toggle.disabled).toBe(true);
		expect(screen.getByText('Add classes in the Planner first.')).toBeTruthy();
	});

	test('enabled and flips highlight mode when a plan has classes', async () => {
		termStore.activeTermId = 1252;
		plannerStore.addOffering([
			{
				id: 1,
				courseCode: 'CMSC 128',
				section: 'AB',
				type: 'LEC',
				schedule: ['MW 07:00AM-08:00AM'],
				roomCode: 'ICS MH',
				directions: null,
				courseTitle: 'Software Engineering',
				roomId: 1,
				termId: 1252
			}
		]);

		mountAtWidth(320);
		render(MapViewControls, { props: { embedded: true, variant: 'modes' } });

		const toggle = screen.getByRole('button', {
			name: /Highlight the buildings/
		}) as HTMLButtonElement;
		expect(toggle.disabled).toBe(false);

		toggle.click();
		expect(map.highlightMyBuildings).toBe(true);
	});
});
