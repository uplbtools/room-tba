import { render, screen } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import TrailPanel from './TrailPanel.svelte';

describe('TrailPanel', () => {
	test('the UPLB trail shows its briefing and a picker with both trails', () => {
		render(TrailPanel, { trailId: 'uplb', stopId: null });

		expect(screen.getByRole('heading', { name: 'Makiling Trail' })).toBeVisible();
		expect(screen.getByRole('link', { name: 'UPLB trail' })).toHaveAttribute(
			'aria-current',
			'true'
		);
		expect(screen.getByRole('link', { name: 'Sipit trail' })).toHaveAttribute(
			'href',
			'/map/trail?trail=sipit'
		);
		expect(screen.getByText(/PHP 10 per person/)).toBeVisible();
		expect(screen.getByText(/0908 988 1778/)).toBeVisible();
		expect(screen.queryByText(/isn't open to visitors yet/)).toBeNull();
		expect(screen.getByText('Out and back')).toBeVisible();
	});

	test('the Sipit trail says it is not open yet and links MCME', () => {
		render(TrailPanel, { trailId: 'sipit', stopId: null });

		expect(screen.getByRole('heading', { name: 'Sipit Trail' })).toBeVisible();
		expect(screen.getByText(/isn't open to visitors yet/)).toBeVisible();
		expect(screen.getByRole('link', { name: 'facebook.com/makilingcenter' })).toHaveAttribute(
			'href',
			'https://www.facebook.com/makilingcenter'
		);
		expect(screen.getByText('One way')).toBeVisible();
		expect(screen.getByText('5 to 8 h')).toBeVisible();
	});

	test('a stop shows its numbers and links to its neighbours', () => {
		render(TrailPanel, { trailId: 'uplb', stopId: 'agila-base' });

		expect(screen.getByRole('heading', { name: 'Agila Base' })).toBeVisible();
		expect(screen.getByText('Station 11')).toBeVisible();
		expect(screen.getByText(/last reliable water/)).toBeVisible();
		expect(screen.getByRole('link', { name: 'Makiling Trail' })).toHaveAttribute(
			'href',
			'/map/trail'
		);
		expect(screen.getByRole('link', { name: /^Previous, / })).toBeVisible();
		expect(screen.getByRole('link', { name: /^Next, / })).toBeVisible();
	});
});
