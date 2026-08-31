import { beforeEach, describe, expect, test, vi } from 'vitest';

const { auth, getContributorProfileForOwner, replaceContributorProfile, ContributorProfileError } = vi.hoisted(() => {
	class MockContributorProfileError extends Error {
		status: number;
		latestEditable: unknown;
		constructor(message: string, status = 400, latestEditable: unknown = null) {
			super(message);
			this.status = status;
			this.latestEditable = latestEditable;
		}
	}
	return {
		auth: vi.fn(),
		getContributorProfileForOwner: vi.fn(),
		replaceContributorProfile: vi.fn(),
		ContributorProfileError: MockContributorProfileError
	};
});

vi.mock('$lib/admin/require-editor', () => ({ editorSessionOrUnauthorized: auth }));
vi.mock('$lib/services/contribution/contributor-profile', () => ({
	ContributorProfileError,
	getContributorProfileForOwner,
	replaceContributorProfile
}));

import { resetRateLimitsForTests } from '$lib/api/rate-limit';
import { GET, PUT } from './+server';

const session = { session: { id: 42 } };
const editable = {
	slug: 'ada-lovelace',
	displayName: 'Ada Lovelace',
	role: 'Contributor',
	bio: 'Analytical engine notes',
	isPublic: true,
	isModeratorHidden: false,
	showInCredits: true,
	avatarUrl: null,
	version: 3,
	updatedAt: '2026-08-29T00:00:00.000Z',
	socialLinks: []
};

function event(request?: Request) {
	return { cookies: {}, request: request ?? new Request('http://localhost/api/contributors/me') } as Parameters<typeof PUT>[0];
}

beforeEach(() => {
	vi.clearAllMocks();
	resetRateLimitsForTests();
	auth.mockResolvedValue(session);
});

describe('/api/contributors/me', () => {
	test('returns owner DTO for authenticated session', async () => {
		getContributorProfileForOwner.mockResolvedValue(editable);
		const response = await GET({ cookies: {} } as Parameters<typeof GET>[0]);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual(editable);
		expect(getContributorProfileForOwner).toHaveBeenCalledWith(42);
	});

	test('rejects oversized body before calling domain service', async () => {
		const body = JSON.stringify({ bio: 'x'.repeat(33_000) });
		const response = await PUT(event(new Request('http://localhost/api/contributors/me', {
			method: 'PUT',
			body,
			headers: { 'content-type': 'application/json' }
		})));

		expect(response.status).toBe(413);
		expect(replaceContributorProfile).not.toHaveBeenCalled();
	});

	test('maps domain conflicts with latest editable profile', async () => {
		replaceContributorProfile.mockRejectedValue(
			new ContributorProfileError('Contributor profile changed on the server.', 409, editable)
		);
		const response = await PUT(event(new Request('http://localhost/api/contributors/me', {
			method: 'PUT',
			body: JSON.stringify({ version: 3 }),
			headers: { 'content-type': 'application/json' }
		})));

		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({
			error: 'Contributor profile changed on the server.',
			profile: editable
		});
	});

	test('returns stable 429 after account update limit', async () => {
		replaceContributorProfile.mockResolvedValue(editable);
		const request = () => new Request('http://localhost/api/contributors/me', {
			method: 'PUT',
			body: JSON.stringify({ version: 3 }),
			headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.25' }
		});
		for (let index = 0; index < 20; index += 1) await PUT(event(request()));
		const response = await PUT(event(request()));

		expect(response.status).toBe(429);
		expect(await response.json()).toEqual({
			error: 'Too many profile updates. Wait a few minutes and try again.'
		});
	});
});
