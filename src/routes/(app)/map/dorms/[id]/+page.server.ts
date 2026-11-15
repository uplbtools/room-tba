import { loadEntitySeo } from '#lib/services/seo/entity-seo.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => loadEntitySeo('dorms', params.id);
