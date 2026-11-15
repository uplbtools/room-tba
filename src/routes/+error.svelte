<script lang="ts">
	import { page } from '$app/state';

	const missing = $derived(page.status === 404);
	const heading = $derived(missing ? 'Place not found' : 'Something went wrong');
</script>

<svelte:head>
	<title>{heading} | Room TBA</title>
	<meta name="robots" content="noindex,follow" />
</svelte:head>

<main class="mx-auto max-w-2xl px-4 pt-16 pb-16 leading-relaxed text-neutral-800">
	<h1 class="text-4xl leading-tight font-bold">{heading}</h1>
	<p class="mt-3">
		{missing
			? "That link doesn't match a place on the UPLB campus map."
			: 'The page hit an error. Try again in a moment.'}
	</p>
	<a class="mt-6 inline-block font-semibold text-[hsl(5,53%,32%)]" href="/map">Back to the map</a>
</main>
