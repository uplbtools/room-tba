import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import EntityPhotoGallery from '#lib/components/controls/EntityPhotoGallery.svelte';

describe('EntityPhotoGallery', () => {
	test('renders contributor attribution as a profile link', () => {
		render(EntityPhotoGallery, {
			props: {
				name: 'CEM 101',
				photos: [
					{
						url: 'https://cdn.example.test/rooms/cem-101.jpg',
						attributionName: 'Photo Contributor',
						attributionProfileUrl: 'https://example.test/contributors/photo'
					}
				]
			}
		});

		expect(screen.getByRole('img', { name: 'CEM 101' })).toBeTruthy();
		expect(screen.getByText('Photo by')).toBeTruthy();
		expect(screen.getByRole('link', { name: 'Photo Contributor' })).toHaveAttribute(
			'href',
			'https://example.test/contributors/photo'
		);
	});

	test('keeps optional photos navigable and credits the active photo', async () => {
		render(EntityPhotoGallery, {
			props: {
				name: "Men's Dorm",
				photos: [
					{
						url: 'https://cdn.example.test/dorms/one.jpg',
						attributionName: 'First Contributor',
						attributionProfileUrl: null
					},
					{
						url: 'https://cdn.example.test/dorms/two.jpg',
						attributionName: 'Second Contributor',
						attributionProfileUrl: null
					}
				]
			}
		});

		expect(screen.getByText('First Contributor')).toBeTruthy();
		await fireEvent.click(screen.getByRole('button', { name: /next photo of Men's Dorm/i }));
		expect(screen.getByText('Second Contributor')).toBeTruthy();
		expect(screen.getByRole('img').getAttribute('src')).toContain('two.jpg');
	});
});
