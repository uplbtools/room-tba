import { describe, expect, test } from 'vitest';
import { scopedUploadPrefix } from './image-upload';

describe('upload boundary prefixes', () => {
	test('accepts only public suggestion entity prefixes', () => {
		const formData = new FormData();
		formData.set('prefix', 'events/summer-fair');
		expect(scopedUploadPrefix(formData, ['buildings', 'events', 'dorms', 'rooms'])).toBe(
			'events/summer-fair'
		);
	});

	test('rejects account and nested prefixes supplied by contributors', () => {
		for (const prefix of ['accounts/42/avatar', 'events/one/avatar', '../events/one']) {
			const formData = new FormData();
			formData.set('prefix', prefix);
			expect(
				scopedUploadPrefix(formData, ['buildings', 'events', 'dorms', 'rooms'])
			).toBeInstanceOf(Response);
		}
	});
});
