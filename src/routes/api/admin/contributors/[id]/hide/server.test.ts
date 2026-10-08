import { describe, expect, test, vi } from 'vitest';

const { editorSessionOrUnauthorized, hideContributorProfile, ContributorProfileError } = vi.hoisted(() => {
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
		editorSessionOrUnauthorized: vi.fn(),
		hideContributorProfile: vi.fn(),
		ContributorProfileError: MockContributorProfileError
	};
});

vi.mock('$lib/admin/require-editor', () => ({ editorSessionOrUnauthorized }));
vi.mock('$lib/services/contribution/contributor-profile', () => ({
	ContributorProfileError,
	hideContributorProfile
}));

import { POST } from './+server';

function request(body: unknown) {
	return new Request('http://localhost/api/admin/contributors/12/hide', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

function event(overrides: Record<string, unknown> = {}) {
	return {
		cookies: {},
		params: { id: '12' },
		request: request({ reason: 'unsafe link' }),
		...overrides
	} as Parameters<typeof POST>[0];
}

describe('POST /api/admin/contributors/[id]/hide', () => {
	test('returns existing authorization response before parsing or calling service', async () => {
		const forbidden = new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
		editorSessionOrUnauthorized.mockResolvedValueOnce(forbidden);

		const response = await POST(event({ request: request({ reason: 'x'.repeat(20_000) }) }));

		expect(response).toBe(forbidden);
		expect(hideContributorProfile).not.toHaveBeenCalled();
	});

	test('rejects missing reason before service call', async () => {
		editorSessionOrUnauthorized.mockResolvedValueOnce({ session: { id: 7 } });

		const response = await POST(event({ request: request({}) }));

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: 'Moderation reason is required.' });
		expect(hideContributorProfile).not.toHaveBeenCalled();
	});

	test('rejects malformed profile IDs before service call', async () => {
		editorSessionOrUnauthorized.mockResolvedValueOnce({ session: { id: 7 } });

		const response = await POST(event({ params: { id: '12abc' } }));

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: 'Invalid contributor profile ID.' });
		expect(hideContributorProfile).not.toHaveBeenCalled();
	});

	test('maps domain status and latest editable profile', async () => {
		editorSessionOrUnauthorized.mockResolvedValueOnce({ session: { id: 7 } });
		const latest = { id: 12, version: 4 };
		hideContributorProfile.mockRejectedValueOnce(new ContributorProfileError('Profile changed.', 409, latest));

		const response = await POST(event());

		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({ error: 'Profile changed.', profile: latest });
		expect(hideContributorProfile).toHaveBeenCalledWith(12, 7, 'unsafe link');
	});

	test('passes only session actor ID on success', async () => {
		editorSessionOrUnauthorized.mockResolvedValueOnce({ session: { id: 7 }, editedBy: 'spoofed' });
		hideContributorProfile.mockResolvedValueOnce({ id: 12, version: 2 });

		const response = await POST(event());

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ success: true, profile: { id: 12, version: 2 } });
		expect(hideContributorProfile).toHaveBeenCalledWith(12, 7, 'unsafe link');
	});
});
