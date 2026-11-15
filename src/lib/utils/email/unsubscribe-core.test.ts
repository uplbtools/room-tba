import { describe, expect, test } from 'vitest';
import { parseUnsubscribeToken, unsubscribeFooter } from './unsubscribe-core';

describe('parseUnsubscribeToken', () => {
	test('accepts a known topic for a user id', () => {
		expect(parseUnsubscribeToken({ purpose: 'unsubscribe', userId: 7, topic: 'digest' })).toEqual({
			purpose: 'unsubscribe',
			userId: 7,
			topic: 'digest'
		});
	});

	test('rejects another purpose, an unknown topic or a bad user id', () => {
		expect(
			parseUnsubscribeToken({ purpose: 'email-verify', userId: 7, topic: 'digest' })
		).toBeNull();
		expect(
			parseUnsubscribeToken({ purpose: 'unsubscribe', userId: 7, topic: 'password' })
		).toBeNull();
		expect(
			parseUnsubscribeToken({ purpose: 'unsubscribe', userId: '7', topic: 'digest' })
		).toBeNull();
		expect(parseUnsubscribeToken(null)).toBeNull();
	});
});

test('the footer names the topic and links to the page with the encoded token', () => {
	const footer = unsubscribeFooter('digest', 'https://room-tba.uplb.tools/', 'a.b+c');
	expect(footer).toContain('the daily review digest');
	expect(footer).toContain('https://room-tba.uplb.tools/unsubscribe?token=a.b%2Bc');
});
