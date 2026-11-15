import type { Cookies } from '@sveltejs/kit';
import { describe, expect, test, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({
	env: {
		ADMIN_PASSWORD: 'test-password',
		ADMIN_SESSION_SECRET: 'test-secret-key-for-tests',
		// require-editor pulls in $lib/db for session revalidation; the pg Pool
		// is lazy, so an empty URL is fine — these tests never reach a query.
		DATABASE_URL: ''
	}
}));

vi.mock('$app/env/private', () => ({ ADMIN_SESSION_SECRET: 'test-secret-key-for-tests' }));

const row = { role: 'editor', displayName: 'Ed', sessionVersion: 2 };
vi.mock('#lib/utils/db.js', () => {
	const chain = {
		select: () => chain,
		from: () => chain,
		leftJoin: () => chain,
		where: () => chain,
		limit: async () => [row]
	};
	return { db: chain };
});

const { editorSessionOrUnauthorized } = await import('./require-editor');
const { createSessionToken } = await import('./auth');

const editor = { id: 1, username: 'ed', displayName: 'Ed', role: 'editor' as const };

function mockCookies(value?: string): Cookies {
	return {
		get: (name: string) => (name === 'admin_session' && value ? value : undefined),
		getAll: () => [],
		set: () => {},
		delete: () => {},
		serialize: () => ''
	} as unknown as Cookies;
}

describe('editorSessionOrUnauthorized', () => {
	test('returns 401 when no session cookie is present', async () => {
		await expect(editorSessionOrUnauthorized(mockCookies())).rejects.toMatchObject({ status: 401 });
	});

	test('returns 401 for malformed session tokens', async () => {
		await expect(
			editorSessionOrUnauthorized(mockCookies('not-a-valid-token'))
		).rejects.toMatchObject({ status: 401 });
	});

	test('rejects a cookie from before the account signed out everywhere', async () => {
		const stale = createSessionToken({ ...editor, sessionVersion: 1 });
		await expect(editorSessionOrUnauthorized(mockCookies(stale))).rejects.toMatchObject({
			status: 401
		});
	});

	test('accepts a cookie with the current session version', async () => {
		const current = createSessionToken({ ...editor, sessionVersion: 2 });
		await expect(editorSessionOrUnauthorized(mockCookies(current))).resolves.toMatchObject({
			session: { id: 1, sessionVersion: 2 }
		});
	});
});
