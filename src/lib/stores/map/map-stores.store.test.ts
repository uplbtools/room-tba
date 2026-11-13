import { beforeEach, describe, expect, test } from 'vitest';
import { Building3DStore, MapToolsStore, TerrainStore } from '../new/map/map-stores.svelte';
import { registerMapMode } from './map-modes.js';

describe('MapToolsStore', () => {
	let store: MapToolsStore;

	beforeEach(() => {
		store = new MapToolsStore();
	});

	test('toggle opens and closes flyout', () => {
		expect(store.open).toBe(false);
		store.toggle();
		expect(store.open).toBe(true);
		store.toggle();
		expect(store.open).toBe(false);
	});

	test('openSection sets active section and expands it', () => {
		store.openSection('terrain');
		expect(store.open).toBe(true);
		expect(store.activeSection).toBe('terrain');
		expect(store.expandedSections.has('terrain')).toBe(true);
	});
});

describe('TerrainStore', () => {
	let store: TerrainStore;
	let editDisabled: boolean;

	beforeEach(() => {
		store = new TerrainStore();
		editDisabled = false;
		registerMapMode('edit', {
			disable: () => {
				editDisabled = true;
			}
		});
	});

	test('enable sets loading and disables map edit', () => {
		store.enable();
		expect(store.enabled).toBe(true);
		expect(store.status).toBe('loading');
		expect(editDisabled).toBe(true);
	});

	test('markUnavailable disables terrain and stores message', () => {
		store.enable();
		store.markUnavailable('Offline');
		expect(store.enabled).toBe(false);
		expect(store.status).toBe('unavailable');
		expect(store.message).toBe('Offline');
	});
});

describe('map', () => {
	test('toggleEventsOnly flips eventsOnly', () => {
		const store = new map();
		store.toggleEventsOnly();
		expect(store.eventsOnly).toBe(true);
		store.showAll();
		expect(store.eventsOnly).toBe(false);
	});

	test('org and place layers default on and toggle independently', () => {
		const store = new map();
		expect(store.showOrgs).toBe(true);
		expect(store.showPlaces).toBe(true);
		store.toggleOrgs();
		expect(store.showOrgs).toBe(false);
		expect(store.showPlaces).toBe(true);
		store.togglePlaces();
		expect(store.showPlaces).toBe(false);
	});

	test('showAll restores hidden pin layers', () => {
		const store = new map();
		store.toggleOrgs();
		store.togglePlaces();
		store.showAll();
		expect(store.showOrgs).toBe(true);
		expect(store.showPlaces).toBe(true);
	});

	test('highlightMyBuildings toggles and leaves events-only mode', () => {
		const store = new map();
		store.toggleEventsOnly();
		store.toggleHighlightMyBuildings();
		expect(store.highlightMyBuildings).toBe(true);
		expect(store.eventsOnly).toBe(false);
		store.toggleHighlightMyBuildings();
		expect(store.highlightMyBuildings).toBe(false);
	});

	test('showAll clears the class-building highlight', () => {
		const store = new map();
		store.toggleHighlightMyBuildings();
		store.showAll();
		expect(store.highlightMyBuildings).toBe(false);
	});
});

describe('Building3DStore', () => {
	test('open and close building viewer', () => {
		const store = new Building3DStore();
		store.open('Test Hall');
		expect(store.buildingName).toBe('Test Hall');
		store.close();
		expect(store.buildingName).toBeNull();
	});
});
