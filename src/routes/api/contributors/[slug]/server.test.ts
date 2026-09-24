import { describe, expect, test, vi } from 'vitest';

const { getPublicContributorProfile, normalizeContributorSlug } = vi.hoisted(() => ({
	getPublicContributorProfile: vi.fn(),
	normalizeContributorSlug: vi.fn((value: unknown) =>
		String(value)
			.normalize('NFKC')
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/gu, '-')
			.replace(/^-+|-+$/gu, '')
	)
}));

vi.mock('$lib/services/contribution/contributor-profile', () => ({
	getPublicContributorProfile,
	normalizeContributorSlug
}));

import { GET } from './+server';

describe('GET /api/contributors/[slug]', () => {
	test('normalizes slug and returns only the public profile DTO', async () => {
		getPublicContributorProfile.mockResolvedValueOnce({
			slug: 'grace-hopper',
			displayName: 'Grace Hopper',
			role: 'Contributor',
			bio: 'Compiler pioneer',
			avatarUrl: null,
			socialLinks: [
				{ kind: 'github', label: null, url: 'https://github.com/grace-hopper' },
				{ kind: 'website', label: 'Site', url: 'https://example.com/grace' }
			],
			userId: 42,
			username: 'private-username',
			isModeratorHidden: false,
			privateLinks: [{ kind: 'messenger', url: 'https://m.me/private' }]
		});

		const response = await GET({ params: { slug: ' Grace   Hopper ' } } as Parameters<typeof GET>[0]);
		expect(normalizeContributorSlug).toHaveBeenCalledWith(' Grace   Hopper ');
		expect(getPublicContributorProfile).toHaveBeenCalledWith('grace-hopper');
		expect(response.status).toBe(200);
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		expect(response.headers.get('content-type')).toContain('application/json');
		expect(await response.json()).toEqual({
			slug: 'grace-hopper',
			displayName: 'Grace Hopper',
			role: 'Contributor',
			bio: 'Compiler pioneer',
			avatarUrl: null,
			socialLinks: [
				{ kind: 'github', label: null, url: 'https://github.com/grace-hopper' },
				{ kind: 'website', label: 'Site', url: 'https://example.com/grace' }
			]
		});
	});

	test('uses the same no-store 404 for unavailable profiles', async () => {
		getPublicContributorProfile.mockResolvedValueOnce(null);

		const response = await GET({ params: { slug: 'hidden-person' } } as Parameters<typeof GET>[0]);
		expect(response.status).toBe(404);
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		expect(response.headers.get('content-type')).toContain('application/json');
		expect(await response.json()).toEqual({ error: 'Not Found' });
	});
});
