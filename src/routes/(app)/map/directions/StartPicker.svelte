<script lang="ts">
	import { getUnionSuggestions } from '#lib/functions/search.remote.js';

	const { onpick }: { onpick: (value: string) => void } = $props();
	const PINNED = ['building', 'room', 'dorm', 'organization', 'place'];

	let text = $state('');
</script>

<input
	type="search"
	bind:value={text}
	placeholder="Search for a starting point"
	aria-label="Starting point"
	class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
/>
{#if text.trim().length > 1}
	<svelte:boundary>
		{#snippet failed()}{/snippet}
		<ul class="flex flex-col">
			{#each (await getUnionSuggestions(text)).filter( ({ type }) => PINNED.includes(type) ) as suggestion (`${suggestion.type}:${suggestion.id}`)}
				<li>
					<button
						type="button"
						class="w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-neutral-100"
						onclick={() => {
							onpick(`${suggestion.type}:${suggestion.id}`);
							text = '';
						}}
					>
						{suggestion.name}
					</button>
				</li>
			{/each}
		</ul>
	</svelte:boundary>
{/if}
