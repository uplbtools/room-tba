import { render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import RoomResultHost from '@test/components/RoomResultHost.svelte';
import type { Room } from '$lib/utils/types';
import { currentRoom, queryStore } from '$lib/stores.svelte';
import { expectNoHorizontalOverflow, mountAtWidth } from '@test/layout-assertions';

function room(overrides: Partial<Room> = {}): Room {
	return {
		id: 7,
		code: 'DSDS MLH',
		fullName: null,
		directions: null,
		building: null,
		buildingId: null,
		collegeId: null,
		divisionId: null,
		collegeName: null,
		divisionName: null,
		category: null,
		version: 1,
		updatedAt: '2026-08-04T00:00:00.000Z',
		...overrides
	};
}

function renderRoom(testRoom: Room) {
	queryStore.hydrateQuery({
		category: 'room',
		type: 'result',
		value: testRoom.code
	});
	currentRoom.setRoom(testRoom);
	return render(RoomResultHost);
}

describe('RoomResult full name (#875)', () => {
	beforeEach(() => {
		// Mounting RoomResult loads classes, finals and terms. Without a stub the
		// real fetch dials localhost and fails the run (no dev server in CI).
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(null, { status: 503 }))
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test('shows the unabbreviated name under the room code', () => {
		renderRoom(room({ fullName: 'DSDS Main Lecture Hall' }));

		expect(screen.getByRole('heading', { name: 'DSDS MLH' })).toBeInTheDocument();
		expect(screen.getByText('DSDS Main Lecture Hall')).toBeInTheDocument();
	});

	test('renders nothing extra when the room has no full name', () => {
		const { container } = renderRoom(room({ fullName: null }));

		expect(screen.getByRole('heading', { name: 'DSDS MLH' })).toBeInTheDocument();
		expect(container.querySelector('.room-full-name')).toBeNull();
	});

	test('a long full name does not overflow the panel at 320px', () => {
		mountAtWidth(320);
		const { container } = renderRoom(
			room({
				code: 'PHYSIO LR',
				fullName: 'Animal Physiology Lecture Room, CVM-IAS Communal Building'
			})
		);

		expectNoHorizontalOverflow(container);
	});
});
