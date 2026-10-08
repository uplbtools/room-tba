import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	select: vi.fn()
}));

vi.mock('$lib/utils/db', () => ({ db: { select: mocks.select } }));

import { resolvePhotoAttribution } from './entity-photo';

describe('photo attribution privacy', () => {
	beforeEach(() => {
		mocks.select.mockReset();
	});

	test('does not link a public profile when credits visibility is disabled', async () => {
		const limit = vi.fn().mockResolvedValue([
			{
				profile: {
					slug: 'public-contributor',
					isPublic: true,
					isModeratorHidden: false
				},
				user: {
					displayName: 'Public Contributor',
					username: 'public-contributor',
					profileUrl: null,
					showInCredits: false,
					isActive: true,
					deletedAt: null,
					avatarUrl: null
				}
			}
		]);
		mocks.select.mockReturnValue({
			from: () => ({
				leftJoin: () => ({
					where: () => ({ limit })
				})
			})
		});

		await expect(resolvePhotoAttribution(7, ' Public Contributor ')).resolves.toEqual({
			name: 'Public Contributor',
			profileUrl: null
		});
	});
});
