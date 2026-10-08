import { render } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import ContributorSocialLinks from './ContributorSocialLinks.svelte';

const longLabel = 'A custom link label that must remain contained at narrow widths '.repeat(4);

describe('ContributorSocialLinks', () => {
	test('renders public links with accessible labels and safe new-tab attributes', () => {
		const { getAllByRole } = render(ContributorSocialLinks, {
			props: {
				links: [
					{ kind: 'discord', label: null, url: 'https://discord.gg/room-tba' },
					{ kind: 'custom', label: 'Project site', url: 'https://example.com/project' }
				]
			}
		});

		const links = getAllByRole('link');
		expect(links).toHaveLength(2);
		expect(links[0]).toHaveAttribute('aria-label', 'Discord');
		expect(links[0]).toHaveAttribute('target', '_blank');
		expect(links[0]).toHaveAttribute('rel', 'noopener noreferrer');
		expect(links[0].querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
		expect(links[1]).toHaveAttribute('aria-label', 'Project site');
		expect(links[1].querySelector('.contributor-social-text-icon')).toHaveTextContent('↗');
	});

	test('keeps long labels inside the wrapping social list', () => {
		const { container } = render(ContributorSocialLinks, {
			props: {
				links: [{ kind: 'custom', label: longLabel, url: 'https://example.com/long' }]
			}
		});

		expect(container.querySelector('.contributor-social-list')).toBeInTheDocument();
		expect(container.querySelector('.contributor-social-label')).toHaveTextContent(longLabel.trim());
		expect(container.querySelector('.contributor-social-link')).toHaveClass('contributor-social-link');
	});
});
