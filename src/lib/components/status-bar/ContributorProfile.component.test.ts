import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import ContributorProfile from './ContributorProfile.svelte';

const mocks = vi.hoisted(() => ({
	getContributorProfile: vi.fn(),
	openAccountSettings: vi.fn()
}));
vi.mock('#lib/functions/leaderboard.remote.js', () => ({
	getContributorProfile: mocks.getContributorProfile
}));
vi.mock('#lib/utils/context.js', () => ({
	getAdminAuthStore: () => ({ openAccountSettings: mocks.openAccountSettings })
}));

const profile = {
	displayName: 'Ana Reyes',
	avatarUrl: null,
	profileUrl: 'https://example.com/ana',
	joinedAt: '2026-09-01T00:00:00.000Z',
	points: 5,
	contributionCount: 2,
	breakdown: { place: 0, rooms: 1, photo: 0, position: 0, text: 1 },
	badges: [
		{ id: 'first', label: 'First edit', threshold: 1, earned: true },
		{ id: 'ten', label: '10 edits', threshold: 10, earned: false }
	],
	recent: [
		{
			id: 2,
			kind: 'rooms',
			entityLabel: 'TH-101',
			href: '/map/rooms/1',
			createdAt: '2026-11-02T00:00:00.000Z'
		},
		{
			id: 1,
			kind: 'text',
			entityLabel: 'Old thing',
			href: null,
			createdAt: '2026-11-01T00:00:00.000Z'
		}
	]
};

const props = { profileKey: 'u2', board: 'community', isMe: false, onback: vi.fn() } as const;

beforeEach(() => {
	mocks.getContributorProfile.mockResolvedValue(profile);
	mocks.openAccountSettings.mockReset();
});

describe('ContributorProfile', () => {
	test('shows the stats, badges and links to what they edited', async () => {
		render(ContributorProfile, props);

		expect(await screen.findByRole('heading', { name: 'Ana Reyes' })).toBeTruthy();
		expect(mocks.getContributorProfile).toHaveBeenCalledWith({ key: 'u2', board: 'community' });
		expect(screen.getByText('Joined September 2026')).toBeTruthy();
		expect(screen.getByText('not earned yet')).toBeTruthy();
		expect(screen.getByRole('link', { name: 'Website' }).getAttribute('href')).toBe(
			'https://example.com/ana'
		);
		expect(screen.getByRole('link', { name: /TH-101/ }).getAttribute('href')).toBe('/map/rooms/1');
		expect(screen.getByText('Old thing').closest('a')).toBeNull();
		expect(screen.queryByRole('button', { name: 'Edit profile' })).toBeNull();
	});

	test('only your own profile can be edited', async () => {
		render(ContributorProfile, { ...props, isMe: true });

		await fireEvent.click(await screen.findByRole('button', { name: 'Edit profile' }));
		expect(mocks.openAccountSettings).toHaveBeenCalledOnce();
	});

	test('a hidden or unknown contributor says the profile is not public', async () => {
		mocks.getContributorProfile.mockResolvedValue(null);
		render(ContributorProfile, props);

		expect(await screen.findByText("This contributor's profile isn't public.")).toBeTruthy();
	});
});
