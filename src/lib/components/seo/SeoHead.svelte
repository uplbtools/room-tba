<script lang="ts">
	import { page } from '$app/state';
	import {
		absoluteUrl,
		DEFAULT_OG_IMAGE,
		OG_IMAGE_HEIGHT,
		OG_IMAGE_WIDTH,
		SITE_URL
	} from '#lib/utils/site.js';
	import type { SeoData } from './seo-data';

	const { seo }: { seo: SeoData } = $props();

	// Prefer the route's declared canonical path over the live pathname: Astro
	// pinned these (trailing slash included) and the app rewrites the URL with
	// history.pushState as you browse, which must not move the canonical.
	const canonicalUrl = $derived(absoluteUrl(seo.canonicalPath || page.url.pathname));
	const imageUrl = $derived(absoluteUrl(seo.imagePath ?? DEFAULT_OG_IMAGE));
	const shareTitle = $derived(seo.ogTitle ?? seo.title);

	// Layout.astro emitted one <script type="application/ld+json"> per entry.
	// `<` is escaped so a string inside the payload can never close the tag early.
	const structuredDataScripts = $derived(
		(seo.structuredData ?? [])
			.map(
				(entry) =>
					`<script type="application/ld+json">${JSON.stringify(entry).replace(/</g, '\\u003c')}<\/script>`
			)
			.join('')
	);
</script>

<svelte:head>
	<title>{seo.title}</title>
	<meta name="description" content={seo.description} />
	<meta name="robots" content={seo.robots ?? 'index, follow'} />
	<link rel="canonical" href={canonicalUrl} />

	<meta property="og:site_name" content="Room TBA" />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={shareTitle} />
	<meta property="og:description" content={seo.description} />
	<meta property="og:image" content={imageUrl} />
	<meta property="og:image:url" content={imageUrl} />
	<meta property="og:image:width" content={String(OG_IMAGE_WIDTH)} />
	<meta property="og:image:height" content={String(OG_IMAGE_HEIGHT)} />
	<meta property="og:image:alt" content={shareTitle} />
	<meta property="og:locale" content="en_US" />

	<meta name="twitter:card" content="summary_large_image" />
	<meta property="twitter:domain" content={new URL(SITE_URL).hostname} />
	<meta property="twitter:url" content={canonicalUrl} />
	<meta name="twitter:title" content={shareTitle} />
	<meta name="twitter:description" content={seo.description} />
	<meta name="twitter:image" content={imageUrl} />
	<meta name="twitter:image:alt" content={shareTitle} />

	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html structuredDataScripts}
</svelte:head>
