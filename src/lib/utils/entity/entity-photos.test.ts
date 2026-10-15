import { describe, expect, test } from 'vitest';
import {
	MAX_ENTITY_PHOTOS,
	entityPhotoUrls,
	normalizeEntityPhotos,
	parseEntityPhotoUrls,
	reconcileEntityPhotos,
	type EntityPhoto
} from './entity-photos';

const PUBLIC_URL = 'https://cdn.example.test';

function photo(url: string, name: string | null = null): EntityPhoto {
	return {
		url,
		attributionName: name,
		attributionProfileUrl: name ? `https://profiles.example.test/${name}` : null
	};
}

describe('parseEntityPhotoUrls', () => {
	test('distinguishes omitted input from an empty removal', () => {
		expect(parseEntityPhotoUrls(undefined, PUBLIC_URL)).toEqual({
			ok: true,
			provided: false,
			photoUrls: []
		});
		expect(parseEntityPhotoUrls([], PUBLIC_URL)).toEqual({
			ok: true,
			provided: true,
			photoUrls: []
		});
	});

	test('accepts the ten-photo boundary', () => {
		const urls = Array.from(
			{ length: MAX_ENTITY_PHOTOS },
			(_, index) => `${PUBLIC_URL}/photo-${index}.jpg`
		);
		expect(parseEntityPhotoUrls(urls, PUBLIC_URL)).toEqual({
			ok: true,
			provided: true,
			photoUrls: urls
		});
	});

	test('rejects collections above the cap', () => {
		const urls = Array.from(
			{ length: MAX_ENTITY_PHOTOS + 1 },
			(_, index) => `${PUBLIC_URL}/photo-${index}.jpg`
		);
		expect(parseEntityPhotoUrls(urls, PUBLIC_URL)).toEqual({
			ok: false,
			error: `A maximum of ${MAX_ENTITY_PHOTOS} photos is allowed`
		});
	});

	test('rejects duplicates and malformed collection entries', () => {
		expect(
			parseEntityPhotoUrls([`${PUBLIC_URL}/same.jpg`, `${PUBLIC_URL}/same.jpg`], PUBLIC_URL)
		).toEqual({ ok: false, error: 'Photo URLs must be unique' });
		expect(parseEntityPhotoUrls([`${PUBLIC_URL}/ok.jpg`, 42], PUBLIC_URL)).toEqual({
			ok: false,
			error: 'Photo URL at index 1 must be a string'
		});
	});

	test('uses the R2 origin validation boundary', () => {
		expect(parseEntityPhotoUrls(['https://evil.example.test/photo.jpg'], PUBLIC_URL)).toEqual({
			ok: false,
			error: "Photo URL must come from this site's upload storage"
		});
	});
});

describe('reconcileEntityPhotos', () => {
	test('preserves retained credits and attributes additions', () => {
		const existing = [
			photo(`${PUBLIC_URL}/first.jpg`, 'old'),
			photo(`${PUBLIC_URL}/second.jpg`, 'removed')
		];
		expect(
			reconcileEntityPhotos(existing, [`${PUBLIC_URL}/first.jpg`, `${PUBLIC_URL}/new.jpg`], {
				name: '  New contributor ',
				profileUrl: ' https://profile.test/u '
			})
		).toEqual([
			existing[0],
			{
				url: `${PUBLIC_URL}/new.jpg`,
				attributionName: 'New contributor',
				attributionProfileUrl: 'https://profile.test/u'
			}
		]);
	});
});

describe('photo collection normalization', () => {
	test('normalizes JSONB values and extracts URLs', () => {
		const stored = JSON.stringify([
			{
				url: `${PUBLIC_URL}/first.jpg`,
				attributionName: 'Contributor',
				attributionProfileUrl: 'https://profiles.example.test/contributor'
			},
			{ url: `${PUBLIC_URL}/second.jpg` },
			`${PUBLIC_URL}/legacy.jpg`,
			{ url: '' },
			null
		]);
		expect(normalizeEntityPhotos(stored)).toEqual([
			{
				url: `${PUBLIC_URL}/first.jpg`,
				attributionName: 'Contributor',
				attributionProfileUrl: 'https://profiles.example.test/contributor'
			},
			{
				url: `${PUBLIC_URL}/second.jpg`,
				attributionName: null,
				attributionProfileUrl: null
			},
			{
				url: `${PUBLIC_URL}/legacy.jpg`,
				attributionName: null,
				attributionProfileUrl: null
			}
		]);
		expect(
			entityPhotoUrls([{ url: `${PUBLIC_URL}/first.jpg` }, `${PUBLIC_URL}/second.jpg`, { url: 42 }])
		).toEqual([`${PUBLIC_URL}/first.jpg`, `${PUBLIC_URL}/second.jpg`]);
	});
	test('deduplicates, trims, and caps malformed JSONB collections', () => {
		const values = Array.from({ length: MAX_ENTITY_PHOTOS + 2 }, (_, index) => ({
			url: ` ${PUBLIC_URL}/${index < 2 ? 'duplicate' : index}.jpg `,
			attributionName: '  Contributor  ',
			attributionProfileUrl: ' '
		}));
		expect(normalizeEntityPhotos(values)).toHaveLength(MAX_ENTITY_PHOTOS);
		expect(normalizeEntityPhotos(values)[0]).toEqual({
			url: `${PUBLIC_URL}/duplicate.jpg`,
			attributionName: 'Contributor',
			attributionProfileUrl: null
		});
	});
});
