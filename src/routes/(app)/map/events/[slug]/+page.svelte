<script lang="ts">
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
</script>

<!-- The map layout hydrates the query, so the visible event view is the panel's
     own EventResult. This copy exists for crawlers, which never run the map. -->
<article class="sr-only">
	<h1>{data.title} at UPLB</h1>
	<p>{data.description}</p>
	<p>Starts {data.startsAtLabel} (campus time).</p>
	{#if data.locationLabel}
		<p>Location: {data.locationLabel}</p>
	{/if}
</article>

<style>
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
