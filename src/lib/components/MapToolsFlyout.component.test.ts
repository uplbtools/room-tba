import { render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
	MapToolsStore,
	MeasureRouteStore,
	TravelTimeStore
} from '#lib/stores/new/map/map-stores.svelte.js';
import { mountAtWidth } from '@test/layout-assertions';
import MapToolsFlyout from './MapToolsFlyout.svelte';

vi.mock('#lib/utils/context.js', async (importOriginal) => ({
	...(await importOriginal<object>()),
	getMapToolsStore: () => mapToolsStore,
	getMeasureRouteStore: () => new MeasureRouteStore(),
	getTravelTimeStore: () => travelTimeStore
}));

let mapToolsStore: MapToolsStore;
let travelTimeStore: TravelTimeStore;

describe('MapToolsFlyout', () => {
	beforeEach(() => {
		mapToolsStore = new MapToolsStore();
		travelTimeStore = new TravelTimeStore();
	});

	test('chip opens the tools panel', async () => {
		mountAtWidth(320);
		render(MapToolsFlyout);
		const chip = screen.getByRole('button', { name: 'Map tools' });
		chip.click();
		expect(mapToolsStore.open).toBe(true);
		expect(await screen.findByRole('dialog', { name: 'Map tools' })).toBeInTheDocument();
	});

	test('travel time toggle activates the tool and hands back the map', async () => {
		mapToolsStore.toggle();
		render(MapToolsFlyout);
		const toggle = await screen.findByRole('button', {
			name: /travel time/i
		});
		toggle.click();
		expect(travelTimeStore.active).toBe(true);
		// Panel closes so the next tap lands on the map.
		expect(mapToolsStore.open).toBe(false);
	});

	test('toggling an active tool turns it off', async () => {
		travelTimeStore.enable();
		mapToolsStore.toggle();
		render(MapToolsFlyout);
		const toggle = await screen.findByRole('button', {
			name: /travel time/i
		});
		expect(toggle).toHaveAttribute('aria-pressed', 'true');
		toggle.click();
		expect(travelTimeStore.active).toBe(false);
	});
});
