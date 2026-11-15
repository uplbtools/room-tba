import { getByTier, type Sponsor } from '#lib/utils/sponsors.js';
import sponsorsData from '../../../../static/sponsors.json';
import type { LayoutServerLoad } from './$types';

export const csr = false;
export const prerender = true;

export const load: LayoutServerLoad = () => {
	const sponsors = sponsorsData.sponsors as Sponsor[];
	return { sponsors: [...getByTier(sponsors, 'gold'), ...getByTier(sponsors, 'silver')] };
};
