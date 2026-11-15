import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import AnnouncementBar from './AnnouncementBar.svelte';
import AnnouncementsStore from '#lib/stores/new/data/AnnouncementsStore.svelte.js';
import type { AnnouncementData } from '#lib/utils/types.js';

let items: AnnouncementData[] = [];
const announcementsStore = new AnnouncementsStore();

vi.mock('#lib/functions/announcements.remote.js', () => ({
	getAnnouncements: vi.fn(async () => items)
}));
vi.mock('#lib/utils/context.js', () => ({
	getAnnouncementsStore: () => announcementsStore,
	getModalStore: () => ({ openModal: vi.fn() })
}));

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
		items = [];
	});

	test('critical notices show without opening the panel; info ones do not', async () => {
		items = [row(1, 'info', 'Just so you know')];
		const { unmount } = render(AnnouncementBar);
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(screen.queryByRole('alert')).toBe(null);
		unmount();

		items = [row(2, 'critical', 'Search is down')];
		render(AnnouncementBar);
		expect(await screen.findByRole('alert')).toHaveTextContent('Search is down');
	});

	test('dismissing hides the bar', async () => {
		items = [row(3, 'critical', 'Search is down')];
		render(AnnouncementBar);

		await fireEvent.click(await screen.findByRole('button', { name: /dismiss announcement/i }));
		await waitFor(() => expect(screen.queryByRole('alert')).toBe(null));
	});
});
