import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, test } from 'vitest';
import AnnouncementBar from './AnnouncementBar.svelte';
import { announcementsStore } from '#lib/stores.svelte.js';
import type { AnnouncementData } from '#lib/utils/types';

const row = (id: number, severity: string, title: string): AnnouncementData =>
	({
		id,
		title,
		body: 'Details in the panel.',
		severity,
		startsOn: '2024-05-01 08:00:00',
		endsOn: null,
		linkUrl: null,
		author: null,
		createdAt: '2024-05-01 08:00:00',
		version: 1,
		updatedAt: '2024-05-01 08:00:00'
	}) as AnnouncementData;

describe('AnnouncementBar', () => {
	beforeEach(() => {
		localStorage.clear();
		announcementsStore.hydrate();
		announcementsStore.items = [];
	});

	test('critical notices show without opening the panel; info ones do not', () => {
		announcementsStore.items = [row(1, 'info', 'Just so you know')];
		const { unmount } = render(AnnouncementBar);
		expect(screen.queryByRole('alert')).toBe(null);
		unmount();

		announcementsStore.items = [row(2, 'critical', 'Search is down')];
		render(AnnouncementBar);
		expect(screen.getByRole('alert')).toHaveTextContent('Search is down');
	});

	test('dismissing hides the bar', async () => {
		announcementsStore.items = [row(3, 'critical', 'Search is down')];
		render(AnnouncementBar);

		await fireEvent.click(screen.getByRole('button', { name: /dismiss announcement/i }));
		expect(screen.queryByRole('alert')).toBe(null);
	});
});
