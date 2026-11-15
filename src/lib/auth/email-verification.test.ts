import { describe, expect, test } from 'vitest';
import { createSignedToken, verifySignedToken } from '#lib/admin/signed-token-core.js';
import {
	EMAIL_VERIFY_TOKEN_TTL_SECONDS,
	buildVerificationEmail,
	parseEmailVerifyToken,
	verifyEmailUrl
} from './email-verification.js';

const SECRET = 'test-secret-for-email-verification';

describe('email verification token', () => {
	test('round-trips a signed, expiring token', () => {
		const token = createSignedToken(
			{ purpose: 'email-verify', userId: 7, email: 'Ana@Example.com' },
			EMAIL_VERIFY_TOKEN_TTL_SECONDS,
			SECRET
		);
		expect(parseEmailVerifyToken(verifySignedToken(token, SECRET))).toEqual({
			purpose: 'email-verify',
			userId: 7,
			email: 'ana@example.com'
		});
	});

	test('an expired token is rejected', () => {
		const token = createSignedToken(
			{ purpose: 'email-verify', userId: 7, email: 'a@x.ph' },
			-1,
			SECRET
		);
		expect(parseEmailVerifyToken(verifySignedToken(token, SECRET))).toBeNull();
	});

	test('tokens minted for another purpose do not verify an email', () => {
		for (const payload of [
			{ purpose: 'password-reset', userId: 7, pwFp: 'abc' },
			{ purpose: 'email-change', userId: 7, newEmail: 'a@x.ph', fromEmail: null },
			{ purpose: 'email-verify', userId: '7', email: 'a@x.ph' },
			{ purpose: 'email-verify', userId: 7, email: 'no-at-sign' }
		]) {
			expect(parseEmailVerifyToken(payload)).toBeNull();
		}
	});
});

describe('verification mail', () => {
	test('links to /verify-email with the token escaped', () => {
		expect(verifyEmailUrl('https://room-tba.uplb.tools/', 'a.b+c')).toBe(
			'https://room-tba.uplb.tools/verify-email?token=a.b%2Bc'
		);
		const mail = buildVerificationEmail({
			siteUrl: 'https://room-tba.uplb.tools',
			token: 'tok',
			username: 'ana'
		});
		expect(mail.text).toContain('Hi ana,');
		expect(mail.text).toContain('/verify-email?token=tok');
	});
});
