<script lang="ts">
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
</script>

<!-- The map layout renders the app; this copy is what crawlers read. -->
<article class="sr-only">
	<h1>UPLB jeepney routes</h1>
	<p>{data.description}</p>
	<ul>
		{#each data.routes as route (route.name)}
			<li>{route.name}: {route.description}</li>
		{/each}
	</ul>
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
