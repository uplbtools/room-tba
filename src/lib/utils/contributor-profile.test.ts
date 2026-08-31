import { describe, expect, test } from 'vitest';
import {
	CONTRIBUTOR_BIO_MAX_LENGTH,
	hasPublicMessagingLink,
	normalizeHttpsUrl,
	normalizeSocialLinkInput,
	sortSocialLinks,
	validateSocialLinkMultiplicity,
	ContributorProfileValidationError
} from './contributor-profile';

describe('contributor profile link validation', () => {
	test('normalizes HTTPS host casing and rejects credentials/fragments', () => {
		expect(normalizeHttpsUrl(' HTTPS://Example.COM/profile ')).toBe('https://example.com/profile');
		expect(() => normalizeHttpsUrl('https://user:pass@example.com')).toThrow(
			ContributorProfileValidationError
		);
		expect(() => normalizeHttpsUrl('https://example.com/profile#contact')).toThrow(
			ContributorProfileValidationError
		);
	});

	test('accepts supported profile paths and rejects lookalike hosts', () => {
		expect(
			normalizeSocialLinkInput({ kind: 'github', url: 'https://github.com/Ada', isPublic: true }, 0)
				.url
		).toBe('https://github.com/Ada');
		expect(
			normalizeSocialLinkInput({ kind: 'messenger', url: 'https://m.me/ada', isPublic: false }, 0)
				.isPublic
		).toBe(false);
		expect(() =>
			normalizeSocialLinkInput(
				{ kind: 'github', url: 'https://github.com.evil.test/ada', isPublic: true },
				0
			)
		).toThrow();
		expect(() =>
			normalizeSocialLinkInput(
				{ kind: 'github', url: 'https://github.com/ada/repo', isPublic: true },
				0
			)
		).toThrow();
	});

	test('requires custom labels and rejects unknown fields', () => {
		expect(() =>
			normalizeSocialLinkInput({ kind: 'custom', url: 'https://example.com', isPublic: true }, 0)
		).toThrow(/label/i);
		expect(() =>
			normalizeSocialLinkInput(
				{ kind: 'website', url: 'https://example.com', isPublic: true, extra: 1 },
				0
			)
		).toThrow(/unknown field/i);
	});

	test('enforces known-kind multiplicity and messaging disclosure signal', () => {
		const links = [
			{ kind: 'github' as const, label: null, url: 'https://github.com/ada', isPublic: true },
			{ kind: 'website' as const, label: null, url: 'https://example.com', isPublic: true },
			{ kind: 'messenger' as const, label: null, url: 'https://m.me/ada', isPublic: true }
		];
		expect(hasPublicMessagingLink(links)).toBe(true);
		expect(() => validateSocialLinkMultiplicity([...links, links[0]])).toThrow(/one GitHub/i);
	});

	test('sorts known kinds before stable website/custom creation order', () => {
		const links = [
			{ kind: 'custom' as const, createdAt: '2026-01-01T00:00:00Z' },
			{ kind: 'github' as const, createdAt: '2026-03-01T00:00:00Z' },
			{ kind: 'website' as const, createdAt: '2026-02-01T00:00:00Z' },
			{ kind: 'custom' as const, createdAt: '2026-02-02T00:00:00Z' }
		];
		expect(sortSocialLinks(links).map((link) => link.kind)).toEqual([
			'github',
			'website',
			'custom',
			'custom'
		]);
	});

	test('keeps documented bio limit explicit', () => {
		expect(CONTRIBUTOR_BIO_MAX_LENGTH).toBe(280);
	});
});
