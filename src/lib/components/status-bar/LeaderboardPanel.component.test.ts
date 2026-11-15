import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import LeaderboardPanel from './LeaderboardPanel.svelte';

const breakdown = (text: number, place = 0) => ({ place, rooms: 0, photo: 0, position: 0, text });

const rows = [
	{
		rank: 1,
		key: 'u1',
		displayName: 'Ana Reyes',
		points: 5,
		breakdown: breakdown(0, 1),
		medal: 1,
		gettingStarted: false
	},
	{
		rank: 1,
		key: 'u2',
		displayName: 'Ben Cruz',
		points: 5,
		breakdown: breakdown(5),
		medal: 1,
		gettingStarted: false
	},
	{
		rank: 3,
		key: 'cabc',
		displayName: 'Cara Lim with a very long name that wraps',
		points: 3,
		breakdown: breakdown(3),
		medal: 3,
		gettingStarted: false
	},
	{
		rank: 4,
		key: 'ndan',
		displayName: 'Dan Uy',
		points: 1,
		breakdown: breakdown(1),
		medal: null,
		gettingStarted: true
	}
];

const mocks = vi.hoisted(() => ({
	getLeaderboard: vi.fn(),
	getMyStanding: vi.fn()
}));
vi.mock('#lib/functions/leaderboard.remote.js', () => mocks);

beforeEach(() => {
	mocks.getLeaderboard.mockImplementation(async ({ window }: { window: string }) => ({
		period: window === 'all' ? null : { label: 'October 2026', daysLeft: 24 },
		rows,
		hallOfFame: [
			{ label: 'September 2026', winners: [{ key: 'u9', displayName: 'Gina Tan', points: 24 }] }
		]
	}));
	mocks.getMyStanding.mockResolvedValue(null);
});

describe('LeaderboardPanel', () => {
	test('ties share a rank and medals need the minimum', async () => {
		const { container } = render(LeaderboardPanel);

		await screen.findByText('Ana Reyes');
		expect(container.querySelectorAll('ol > li')).toHaveLength(4);
		expect(screen.getAllByRole('img', { name: 'Rank 1, gold' })).toHaveLength(2);
		expect(screen.getByRole('img', { name: 'Rank 3, bronze' })).toBeTruthy();
		expect(screen.queryByRole('img', { name: /Rank 2/ })).toBeNull();
		expect(screen.getByText('Getting started')).toBeTruthy();
		expect(screen.getByText('Suggest an edit on any place to join the board.')).toBeTruthy();
	});

	test('the period picker reloads the board and shows the days left', async () => {
		render(LeaderboardPanel);

		const group = await screen.findByRole('radiogroup', { name: 'Period' });
		const radios = within(group).getAllByRole('radio');
		expect(radios.map((radio) => radio.parentElement?.textContent?.trim())).toEqual([
			'This month',
			'This semester',
			'All time'
		]);
		expect((radios[0] as HTMLInputElement).checked).toBe(true);
		expect(await screen.findByText('Ends in 24 days')).toBeTruthy();

		await fireEvent.click(radios[2]!);
		await waitFor(() =>
			expect(mocks.getLeaderboard).toHaveBeenCalledWith({ window: 'all', board: 'community' })
		);
		await waitFor(() => expect(screen.queryByText('Ends in 24 days')).toBeNull());
	});

	test('the Editors tab asks for the editors board', async () => {
		render(LeaderboardPanel);

		await fireEvent.click(await screen.findByRole('tab', { name: 'Editors' }));
		await waitFor(() =>
			expect(mocks.getLeaderboard).toHaveBeenCalledWith({ window: 'month', board: 'editors' })
		);
	});

	test('tapping points shows the breakdown', async () => {
		render(LeaderboardPanel);

		const scores = await screen.findAllByRole('button', { name: /show breakdown/ });
		await fireEvent.click(scores[1]!);
		const list = await screen.findByRole('list', { name: 'Points breakdown' });
		expect(within(list).getByText('Text edits')).toBeTruthy();
		expect(scores[1]?.getAttribute('aria-expanded')).toBe('true');
	});

	test('pins your rank with the gap to the next place', async () => {
		mocks.getMyStanding.mockResolvedValue({
			key: 'u2',
			rank: 34,
			points: 6,
			breakdown: breakdown(6),
			toPass: { points: 3, rank: 33 },
			optedOut: false
		});
		render(LeaderboardPanel);

		const mine = await screen.findByLabelText('Your rank');
		expect(within(mine).getByText('#34')).toBeTruthy();
		expect(within(mine).getByText('3 more to pass #33')).toBeTruthy();
		expect(within(mine).getByText('6')).toBeTruthy();
		expect(screen.getAllByText('You')).toHaveLength(2);
	});

	test('explains the points and lists the hall of fame, with no interpuncts', async () => {
		const { container } = render(LeaderboardPanel);

		expect(await screen.findByRole('heading', { name: 'Hall of fame' })).toBeTruthy();
		expect(screen.getByText('Gina Tan')).toBeTruthy();
		expect(screen.getByText('How points work')).toBeTruthy();
		expect(screen.getByText('New places')).toBeTruthy();
		expect(container.textContent).not.toContain('·');
	});

	test('a failed load shows one error line', async () => {
		mocks.getLeaderboard.mockRejectedValue(new Error('down'));
		render(LeaderboardPanel);

		expect(await screen.findByText("Couldn't load the leaderboard.")).toBeTruthy();
	});
});
