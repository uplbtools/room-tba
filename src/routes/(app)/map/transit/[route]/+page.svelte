<script lang="ts">
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
</script>

<!-- The map layout renders the app; this copy is what crawlers read. -->
<article class="sr-only">
	<h1>{data.routeName}</h1>
	<p>{data.description}</p>
	{#if data.stopCount !== null}
		<p>{data.stopCount} stops. Regular fare: ₱{data.regularFare}.</p>
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
