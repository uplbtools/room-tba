import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, test, vi } from 'vitest';
import TransitRoute from './TransitRoute.svelte';
import { JEEPNEY_ROUTES, type JeepneyRoute } from '#lib/constants/map/jeepney-routes.js';

const withGeometry = (route: JeepneyRoute) => ({
	...route,
	geometry: { line: null, source: 'stops-only' as const, caveat: null }
});

describe('TransitRoute', () => {
	test('shows the picked direction, its code and its stop order on Kaliwa/Kanan', async () => {
		const route = JEEPNEY_ROUTES.find((r) => r.id === 'kaliwa-kanan')!;
		const onreverse = vi.fn();
		const view = render(TransitRoute, { route: withGeometry(route), onreverse });

		expect(screen.getByText('KN')).toBeVisible();
		expect(screen.queryByText('KL')).toBeNull();
		expect(document.querySelectorAll('ol li')[1]).toHaveTextContent(route.stops[1]!.name);

		await fireEvent.click(screen.getByRole('button', { name: 'Kaliwa' }));
		expect(onreverse).toHaveBeenCalledWith(true);

		await view.rerender({ route: withGeometry(route), reversed: true, onreverse });
		expect(screen.getByText('KL')).toBeVisible();
		expect(screen.queryByText('KN')).toBeNull();
		expect(screen.getByRole('button', { name: 'Kaliwa' })).toHaveAttribute('aria-pressed', 'true');
		expect(document.querySelectorAll('ol li')[1]).toHaveTextContent(route.stops.at(-2)!.name);
	});

	test('shows where jeeps end on Kaliwa/Kanan', () => {
		const route = JEEPNEY_ROUTES.find((r) => r.id === 'kaliwa-kanan')!;
		render(TransitRoute, { route: withGeometry(route) });

		expect(screen.getByText('Olivarez')).toBeVisible();
		expect(screen.getByText(/Jollibee at the end of Lopez Ave/)).toBeVisible();
	});

	test('shows the DLTB seat price and departure chips on the UP Diliman bus', () => {
		const route: JeepneyRoute = {
			id: 'uplb-to-upd',
			name: 'UPLB → UP Diliman',
			description: '',
			color: '#0f766e',
			fare: { regular: 0, discounted: 0 },
			stops: []
		};
		render(TransitRoute, { route: withGeometry(route) });

		expect(screen.getByText('₱197')).toBeVisible();
		expect(screen.getByRole('link', { name: 'DLTB website' })).toHaveAttribute(
			'href',
			'https://dltb.ph/'
		);
		expect(screen.getByText(/leaves at/)).toBeVisible();
		expect(screen.getByText('1:00 PM')).toBeVisible();
	});
});
