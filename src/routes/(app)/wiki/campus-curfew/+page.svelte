<script lang="ts">
	import WikiProvenance from '../WikiProvenance.svelte';
	import type { PageData } from './$types';
	import { CAMPUS_CURFEW } from '#lib/constants/content/campus-curfew.js';

	const { data }: { data: PageData } = $props();
</script>

<article class="wiki-article">
	<header class="article-hero">
		<h1 class="wiki-title">Campus curfew and dorm permits</h1>
		<p class="wiki-lede">
			This page covers the curfew and return permits that apply to residents of UP-managed
			dormitories.
		</p>
		<WikiProvenance {data} />
	</header>

	<section aria-labelledby="curfew-hours">
		<h2 id="curfew-hours">Curfew hours</h2>
		<p>The campus curfew runs from <strong>{CAMPUS_CURFEW.hours}</strong>.</p>
		<p>{CAMPUS_CURFEW.noLoitering}</p>
	</section>

	<section aria-labelledby="dorm-permits">
		<h2 id="dorm-permits">UP-managed dorm residents</h2>
		<ul>
			<li>{CAMPUS_CURFEW.residentRule}</li>
			<li>{CAMPUS_CURFEW.latePermit}</li>
			<li>{CAMPUS_CURFEW.overnightPermit}</li>
		</ul>
	</section>

	<section aria-labelledby="curfew-help">
		<h2 id="curfew-help">Who to ask</h2>
		<p>
			Permit rules are set and applied by each dormitory’s management, so the office that issued
			your dorm slot is the authority, not this page. Find your dorm’s details in the <a
				href="/dorm/">dorm directory</a
			>. If you are locked out or someone is in trouble after hours, call
			<a href="/wiki/emergency-hotlines">campus security and the emergency hotlines</a>.
		</p>
	</section>
</article>
