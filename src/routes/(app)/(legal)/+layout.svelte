<script lang="ts">
	import type { Snippet } from 'svelte';

	const { children }: { children: Snippet } = $props();
</script>

<main
	class="mx-auto max-w-2xl px-4 pt-8 pb-16 leading-relaxed text-neutral-800 [&_a]:font-semibold [&_a]:text-[hsl(5,53%,32%)] [&_code]:rounded [&_code]:bg-neutral-100 [&_code]:px-1 [&_code]:text-[0.8125rem] [&_h1]:text-4xl [&_h1]:leading-tight [&_h1]:font-bold [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:font-semibold [&_li+li]:mt-1.5 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5"
>
	<a href="/map" class="mb-6 inline-block">← Back to Room TBA</a>
	{@render children()}
</main>
