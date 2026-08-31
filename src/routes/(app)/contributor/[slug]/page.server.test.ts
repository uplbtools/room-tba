import { describe, expect, test, vi } from 'vitest';

const { getPublicContributorProfile, normalizeContributorSlug } = vi.hoisted(() => ({
	getPublicContributorProfile: vi.fn(),
	normalizeContributorSlug: vi.fn((value: unknown) => String(value).trim().toLowerCase())
}));

vi.mock('$lib/services/contribution/contributor-profile', () => ({
	getPublicContributorProfile,
	normalizeContributorSlug
}));

import { load } from './+page.server';

describe('contributor profile SSR load', () => {
	test('sets private no-store headers and calls service with normalized slug', async () => {
		getPublicContributorProfile.mockResolvedValueOnce({
			slug: 'ada-lovelace',
			displayName: 'Ada Lovelace',
			role: 'Editor',
			bio: 'Writes notes',
			avatarUrl: null,
			socialLinks: []
		});
		const setHeaders = vi.fn();

		const result = await load({
			params: { slug: ' Ada-Lovelace ' },
			setHeaders
		} as unknown as Parameters<typeof load>[0]);

		expect(setHeaders).toHaveBeenCalledWith({ 'cache-control': 'private, no-store' });
		expect(getPublicContributorProfile).toHaveBeenCalledWith('ada-lovelace');
		if (!result?.profile || !result.seo) throw new Error('Expected contributor profile load data.');
		expect(result.profile.displayName).toBe('Ada Lovelace');
		expect(result.seo.canonicalPath).toBe('/contributor/ada-lovelace');
	});

	test('returns 404 for unavailable profile', async () => {
		getPublicContributorProfile.mockResolvedValueOnce(null);

		await expect(
			load({
				params: { slug: 'private-person' },
				setHeaders: vi.fn()
			} as unknown as Parameters<typeof load>[0])
		).rejects.toMatchObject({ status: 404 });
	});
});
