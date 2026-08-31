import { render } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import ContributorPage from './+page.svelte';

describe('contributor profile page', () => {
	test('renders decorative fallback avatar, plain bio, and contained social links', () => {
		const { container, getByRole } = render(ContributorPage, {
			props: {
				data: {
					profile: {
						slug: 'grace-hopper',
						displayName: 'Grace Hopper',
						role: 'Contributor',
						bio: 'Compiler pioneer\nLong text stays plain text.',
						avatarUrl: null,
						socialLinks: [
							{ kind: 'website', label: 'Project site', url: 'https://example.com/project' }
						]
					},
					seo: {
						title: 'Grace Hopper | Room TBA Contributor',
						description: 'Grace Hopper profile',
						canonicalPath: '/contributor/grace-hopper'
					}
				}
			}
		});

		expect(getByRole('heading', { name: 'Grace Hopper' })).toBeInTheDocument();
		expect(container.querySelector('img')).toHaveAttribute('src', '/profile.svg');
		expect(container.querySelector('img')).toHaveAttribute('alt', '');
		expect(container.querySelector('.contributor-bio')).toHaveTextContent(
			'Compiler pioneer Long text stays plain text.'
		);
		expect(container.querySelector('.contributor-page')).toHaveClass('contributor-page');
	});
});
