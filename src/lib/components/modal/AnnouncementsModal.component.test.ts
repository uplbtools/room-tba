import { render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import AnnouncementsModal from './AnnouncementsModal.svelte';
import AnnouncementsStore from '#lib/stores/new/data/AnnouncementsStore.svelte.js';
import type { AnnouncementData } from '#lib/utils/types.js';

let items: AnnouncementData[] = [];
const announcementsStore = new AnnouncementsStore();

vi.mock('#lib/functions/announcements.remote.js', () => ({
	getAnnouncements: vi.fn(async () => items)
}));
vi.mock('#lib/utils/context.js', () => ({
	getAnnouncementsStore: () => announcementsStore,
	getAdminAuthStore: () => ({ canPublish: false }),
	getModalStore: () => ({ openModal: vi.fn() })
}));

const row = (id: number, overrides: Partial<AnnouncementData> = {}): AnnouncementData =>
	({
		id,
		title: `Notice ${id}`,
		body: `Body ${id}`,
		severity: 'info',
		startsOn: '2020-01-01 08:00:00',
		endsOn: null,
		linkUrl: null,
		author: 'Room TBA',
		createdAt: '2020-01-01 08:00:00',
		version: 1,
		updatedAt: '2020-01-01 08:00:00',
		...overrides
	}) as AnnouncementData;

describe('AnnouncementsModal', () => {
	beforeEach(() => {
		localStorage.clear();
		announcementsStore.hydrate();
		items = [];
	});

	test('lists announcements newest first with a relative date and severity', async () => {
		items = [
			row(2, { title: 'Newer', startsOn: '2024-05-02 08:00:00' }),
			row(1, { title: 'Older', startsOn: '2024-05-01 08:00:00' })
		];
		render(AnnouncementsModal);

		const titles = (await screen.findAllByRole('heading', { level: 3 })).map(
			(el) => el.textContent
		);
		expect(titles).toEqual(['Newer', 'Older']);
		expect(screen.getAllByText(/ago$/).length).toBe(2);
		expect(screen.getAllByText('Info').length).toBe(2);
	});

	test('reading the panel clears the unread badge', async () => {
		items = [row(1)];
		expect(announcementsStore.unread(items)).toBe(1);

		render(AnnouncementsModal);
		await waitFor(() => expect(announcementsStore.unread(items)).toBe(0));
	});

	test('editor controls stay hidden for readers', async () => {
		items = [row(1)];
		render(AnnouncementsModal);
		await screen.findByText('Notice 1');

		expect(screen.queryByRole('button', { name: /new announcement/i })).toBe(null);
		expect(screen.queryByRole('button', { name: /^delete$/i })).toBe(null);
	});

	test('empty state instead of a blank panel', async () => {
		render(AnnouncementsModal);
		expect(await screen.findByText(/no announcements right now/i)).toBeVisible();
	});
});
