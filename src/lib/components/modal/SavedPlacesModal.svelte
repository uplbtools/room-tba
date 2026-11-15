<script lang="ts">
	import MapPin from '@lucide/svelte/icons/map-pin';
	import X from '@lucide/svelte/icons/x';
	import { getModalStore, getSavedPlacesStore } from '#lib/utils/context.js';
	import type { SavedPlace } from '#lib/stores/new/data/SavedPlacesStore.svelte.js';

	const modalStore = getModalStore();
	const savedPlaces = getSavedPlacesStore();
</script>

{#snippet row(place: SavedPlace, removable: boolean)}
	<li class="flex items-center gap-1">
		<a
			class="flex min-h-11 flex-1 items-center gap-2 rounded-lg px-2 text-sm hover:bg-neutral-100"
			href={place.href}
			onclick={() => modalStore.closeModal()}
		>
			<MapPin size={18} aria-hidden="true" class="shrink-0 text-neutral-500" />
			{place.label}
		</a>
		{#if removable}
			<button
				type="button"
				class="grid size-11 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100"
				aria-label="Remove {place.label} from Saved"
				onclick={() => savedPlaces.toggle(place.href, place.label)}
			>
				<X size={16} aria-hidden="true" />
			</button>
		{/if}
	</li>
{/snippet}

<div>
	<h2 class="text-xl font-semibold">Saved</h2>
	<p class="text-sm text-neutral-600">
		These are the places you saved and opened recently, on this device.
	</p>
</div>

<section aria-labelledby="saved-places-saved">
	<h3 id="saved-places-saved" class="text-sm font-medium text-[hsl(345_75%_31%)]">Saved places</h3>
	{#if savedPlaces.saved.length === 0}
		<p class="py-2 text-sm text-neutral-600">Tap Save on any place to keep it here.</p>
	{:else}
		<ul>
			{#each savedPlaces.saved as place (place.href)}
				{@render row(place, true)}
			{/each}
		</ul>
	{/if}
</section>

<section aria-labelledby="saved-places-recent">
	<div class="flex items-center justify-between">
		<h3 id="saved-places-recent" class="text-sm font-medium text-[hsl(345_75%_31%)]">
			Recently viewed
		</h3>
		{#if savedPlaces.recent.length > 0}
			<button
				type="button"
				class="min-h-11 px-2 text-sm text-neutral-600 underline"
				onclick={() => savedPlaces.clearRecent()}
			>
				Clear
			</button>
		{/if}
	</div>
	{#if savedPlaces.recent.length === 0}
		<p class="py-2 text-sm text-neutral-600">Places you open show up here.</p>
	{:else}
		<ul>
			{#each savedPlaces.recent as place (place.href)}
				{@render row(place, false)}
			{/each}
		</ul>
	{/if}
</section>
