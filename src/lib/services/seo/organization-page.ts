import { error } from '@sveltejs/kit';
import type { EntityIndexItem, SeoData } from '#lib/components/seo/seo-data.js';
import { isStudentOrganization, orgCategoryLabel } from '#lib/constants/content/categories/org.js';
import {
	entityIndexPath,
	getOrganizationCanonicalPath,
	parseRouteSlug
} from '#lib/utils/entity/entity-urls.js';
import { getAllOrganizations } from '#lib/services/entity/map-data.js';
import { getOrganizationPageData } from '#lib/services/page-data/entity.js';
import {
	absoluteUrl,
	breadcrumbSchema,
	jsonLd,
	ogCardPath,
	ogImageUrl,
	webpageSchema
} from '#lib/utils/site.js';

/** Shared by /organization/[slug] and /unit/[slug] — identical in Astro. */
export async function loadOrganizationPage(slug: string) {
	const organizationId = parseRouteSlug(slug).id;
	if (!organizationId) error(404, 'Not Found');

	const appData = await getOrganizationPageData(organizationId);
	if (!appData) error(404, 'Not Found');

	const { organization, buildingName } = appData;
	const category = orgCategoryLabel(organization.category) ?? 'Organization';
	const kind = isStudentOrganization(organization.category)
		? 'Student organization'
		: 'Office or academic unit';
	const canonicalPath = getOrganizationCanonicalPath(organization);
	const title = `${organization.name} | ${kind} at UPLB | Room TBA`;
	const description = organization.description
		? `${organization.name} is a ${kind.toLowerCase()} at UPLB. ${organization.description}`
		: `Find ${organization.name}, a ${kind.toLowerCase()} at UPLB, on the Room TBA campus map.`;

	const seo: SeoData = {
		title,
		description,
		canonicalPath,
		imagePath: ogCardPath({
			title: organization.name,
			subtitle: buildingName ? `${category} · ${buildingName}` : category,
			kicker: `${kind} at UPLB`
		}),
		structuredData: jsonLd(
			webpageSchema({ title, description, path: canonicalPath }),
			breadcrumbSchema([
				{ name: 'Home', path: '/' },
				{ name: kind, path: canonicalPath },
				{ name: organization.name, path: canonicalPath }
			]),
			{
				'@context': 'https://schema.org',
				'@type': 'Organization',
				name: organization.name,
				description,
				url: absoluteUrl(canonicalPath),
				image: ogImageUrl(organization.imageUrl ?? undefined),
				email: organization.email ?? undefined,
				sameAs: [organization.websiteLink, organization.facebookLink].filter(
					(value): value is string => Boolean(value)
				)
			}
		)
	};

	return {
		seo,
		initialSearch: { category: 'organization' as const, value: organization.name }
	};
}

type OrganizationSegment = 'organizations' | 'units';

const ORGANIZATION_INDEX_COPY = {
	organizations: {
		kind: 'Student organizations',
		title: 'UPLB student organizations | Room TBA',
		description:
			'Browse UPLB student organizations, councils, and publications on Room TBA, each pinned to where it sits on the campus map.',
		heading: 'UPLB student organization pages',
		intro:
			'Browse crawlable pages for student organizations, councils, and publications at UPLB. Each page opens the organization result view with its map pin and contact links.'
	},
	units: {
		kind: 'Offices and academic units',
		title: 'UPLB offices and academic units | Room TBA',
		description:
			'Browse UPLB offices, academic units, and campus services on Room TBA, each pinned to the building that houses it.',
		heading: 'UPLB office and academic unit pages',
		intro:
			'Browse crawlable pages for offices, academic units, and services at UPLB. Each page opens the unit result view with its map pin and contact links.'
	}
} as const satisfies Record<OrganizationSegment, Record<string, string>>;

/**
 * Index for /map/organizations/ and /map/units/. One narrow query against the
 * organizations table — the whole app dataset is not needed to list names, and
 * the category split is the same one `getOrganizationCanonicalPath` applies, so
 * every row lands under the segment its own links point at.
 */
export async function loadOrganizationIndexPage(segment: OrganizationSegment) {
	const organizations = await getAllOrganizations();
	const wantStudentOrgs = segment === 'organizations';
	const copy = ORGANIZATION_INDEX_COPY[segment];

	const items: EntityIndexItem[] = organizations
		.filter((organization) => isStudentOrganization(organization.category) === wantStudentOrgs)
		.sort((a, b) => a.name.localeCompare(b.name))
		.map((organization) => {
			const href = getOrganizationCanonicalPath(organization);
			return {
				href,
				label: organization.name,
				description: orgCategoryLabel(organization.category) ?? undefined,
				copyUrl: absoluteUrl(href),
				copyLabel: `Copy link to ${organization.name}`
			};
		});

	const canonicalPath = entityIndexPath(segment);
	const seo: SeoData = {
		title: copy.title,
		description: copy.description,
		canonicalPath,
		structuredData: jsonLd(
			webpageSchema({ title: copy.title, description: copy.description, path: canonicalPath }),
			breadcrumbSchema([
				{ name: 'Home', path: '/' },
				{ name: copy.kind, path: canonicalPath }
			])
		)
	};

	return {
		// Tells the side panel this route owns its body.
		panel: 'browse' as const,
		seo,
		items,
		heading: copy.heading,
		intro: copy.intro
	};
}
