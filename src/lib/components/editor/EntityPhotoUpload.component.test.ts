import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import EntityPhotoUpload from '#lib/components/editor/EntityPhotoUpload.svelte';

beforeEach(() => {
	vi.stubGlobal(
		'fetch',
		vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
			if (init?.method === 'POST') {
				return Response.json({ url: 'https://cdn.example.test/new.jpg' });
			}
			return Response.json({ configured: true });
		})
	);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('EntityPhotoUpload', () => {
	test('renders saved photo credits and removes a photo', async () => {
		const photos = [
			{
				url: 'https://cdn.example.test/buildings/one.jpg',
				attributionName: 'Photo Contributor',
				attributionProfileUrl: 'https://example.test/contributors/photo'
			},
			{
				url: 'https://cdn.example.test/buildings/two.jpg',
				attributionName: null,
				attributionProfileUrl: null
			}
		];

		const { container } = render(EntityPhotoUpload, {
			props: { photos }
		});

		expect(screen.getByRole('link', { name: 'Photo Contributor' })).toHaveAttribute(
			'href',
			'https://example.test/contributors/photo'
		);
		expect(container.querySelectorAll('img')).toHaveLength(2);

		await fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]);

		expect(screen.queryByRole('link', { name: 'Photo Contributor' })).toBeNull();
		expect(container.querySelector('img[src*="two.jpg"]')).toBeTruthy();
	});

	test('keeps the uploaded URL in the photo collection', async () => {
		const onuploaded = vi.fn();
		const { container } = render(EntityPhotoUpload, {
			props: { onuploaded }
		});
		const input = container.querySelector('input[type="file"]');
		if (!(input instanceof HTMLInputElement)) throw new Error('file input missing');

		const file = new File([new Uint8Array([1, 2, 3])], 'photo.jpg', {
			type: 'image/jpeg'
		});
		await fireEvent.change(input, { target: { files: [file] } });

		await waitFor(() => {
			expect(onuploaded).toHaveBeenCalledWith('https://cdn.example.test/new.jpg');
			expect(container.querySelector('img[src="https://cdn.example.test/new.jpg"]')).toBeTruthy();
		});
	});
});
