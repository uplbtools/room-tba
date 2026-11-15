import { loadEntitySeo } from '#lib/services/seo/entity-seo.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => loadEntitySeo('divisions', params.id);
