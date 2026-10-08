import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import AccountSettingsModal from '$lib/components/AccountSettingsModal.svelte';
import { adminAuthStore } from '$lib/stores.svelte';

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

const accountProfile = {
	username: 'ada',
	displayName: 'Ada Lovelace',
	email: 'ada@example.com',
	role: 'contributor',
	hasPassword: true,
	linkedGoogle: false,
	avatarUrl: 'https://cdn.example/avatar.png',
	profileUrl: null,
	showInCredits: true
};

const contributorProfile = {
	displayName: 'Ada Lovelace',
	role: 'Contributor',
	bio: 'Initial bio',
	isPublic: true,
	showInCredits: true,
	avatarUrl: accountProfile.avatarUrl,
	version: 1,
	socialLinks: []
};

describe('AccountSettingsModal', () => {
	beforeEach(() => {
		adminAuthStore.closeAccountSettings();
	});

	afterEach(() => {
		adminAuthStore.closeAccountSettings();
		vi.unstubAllGlobals();
	});

	test('uses updated contributor version after an avatar save failure', async () => {
		const putBodies: Array<{ version: number; bio: string }> = [];
		const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
			const path =
				typeof input === 'string' ? new URL(input, 'http://localhost').pathname : input.pathname;
			const method = init?.method ?? 'GET';

			if (path === '/api/contributors/me' && method === 'GET')
				return jsonResponse(contributorProfile);
			if (path === '/api/account/me' && method === 'GET') return jsonResponse(accountProfile);
			if (path === '/api/account/avatar' && method === 'GET')
				return jsonResponse({ configured: true });
			if (path === '/api/account/avatar' && method === 'POST') {
				return jsonResponse({ url: 'https://cdn.example/avatar-new.png' });
			}
			if (path === '/api/contributions/mine') return jsonResponse({ contributions: [] });
			if (path === '/api/admin/auth') return jsonResponse({ loggedIn: true, username: 'ada' });
			if (path === '/api/contributors/me' && method === 'PUT') {
				const body = JSON.parse(init?.body as string) as { version: number; bio: string };
				putBodies.push(body);
				return jsonResponse({
					...contributorProfile,
					bio: body.bio,
					version: body.version + 1
				});
			}
			if (path === '/api/account/me' && method === 'PATCH') {
				return jsonResponse({}, 500);
			}
			throw new Error(`Unexpected fetch: ${method} ${path}`);
		});
		vi.stubGlobal('fetch', fetchMock);

		adminAuthStore.openAccountSettings();
		render(AccountSettingsModal);

		const bio = await screen.findByLabelText('Bio');
		const avatarInput = screen.getByLabelText('Profile photo');
		await vi.waitFor(() => expect(avatarInput).not.toBeDisabled());
		const avatarFile = new File([new Uint8Array([1, 2, 3])], 'avatar.png', {
			type: 'image/png'
		});
		await fireEvent.change(avatarInput, { target: { files: [avatarFile] } });
		await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Remove' })).toBeVisible());
		await fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
		await fireEvent.input(bio, { target: { value: 'First change' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

		expect(
			await screen.findByText('Profile saved, but account photo could not be saved.')
		).toBeVisible();

		await fireEvent.input(bio, { target: { value: 'Second change' } });
		await fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));
		await vi.waitFor(() => expect(putBodies).toHaveLength(2));

		expect(putBodies.map(({ version }) => version)).toEqual([1, 2]);
	});
});
