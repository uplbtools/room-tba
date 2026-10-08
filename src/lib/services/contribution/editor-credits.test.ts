import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	execute: vi.fn(),
	resolve: vi.fn()
}));

vi.mock('$lib/utils/db', () => ({ db: { execute: mocks.execute } }));
vi.mock('./contributor-profile', () => ({
	resolveContributorAttribution: mocks.resolve
}));

import { getEditorCredits } from './editor-credits';
import { resolvePhotoAttribution } from './entity-photo';

describe('contributor attribution integrations', () => {
	beforeEach(() => {
		mocks.execute.mockReset();
		mocks.resolve.mockReset();
	});

	test('editor credits resolve account IDs in SQL order without exposing profile state', async () => {
		mocks.execute.mockResolvedValue({
			rows: [
				{ userId: 11, name: 'Public Name' },
				{ userId: 12, name: 'Private Name' }
			]
		});
		mocks.resolve
			.mockResolvedValueOnce({ name: 'Public Name', avatarUrl: null, href: '/contributor/public-name' })
			.mockResolvedValueOnce({ name: 'Private Name', avatarUrl: null, href: null });

		expect(await getEditorCredits()).toEqual([
			{ name: 'Public Name', avatarUrl: null, href: '/contributor/public-name' },
			{ name: 'Private Name', avatarUrl: null, href: null }
		]);
		expect(mocks.resolve).toHaveBeenNthCalledWith(1, 11);
		expect(mocks.resolve).toHaveBeenNthCalledWith(2, 12);
	});

	test('photo attribution maps internal, legacy, and plain-text resolver outcomes', async () => {
		mocks.resolve
			.mockResolvedValueOnce({ name: 'Contributor', avatarUrl: null, href: '/contributor/contributor' })
			.mockResolvedValueOnce({ name: 'Contributor', avatarUrl: null, href: 'https://example.com/profile' })
			.mockResolvedValueOnce({ name: 'Contributor', avatarUrl: null, href: null });

		await expect(resolvePhotoAttribution(1, ' Contributor ')).resolves.toEqual({
			name: 'Contributor',
			profileUrl: '/contributor/contributor'
		});
		await expect(resolvePhotoAttribution(2, ' Contributor ')).resolves.toEqual({
			name: 'Contributor',
			profileUrl: 'https://example.com/profile'
		});
		await expect(resolvePhotoAttribution(3, ' Contributor ')).resolves.toEqual({
			name: 'Contributor',
			profileUrl: null
		});
	});
});
