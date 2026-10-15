import { loadOrganizationIndexPage } from '#lib/services/seo/organization-page.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => loadOrganizationIndexPage('organizations');
