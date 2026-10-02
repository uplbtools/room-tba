<script lang="ts">
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import BookText from '@lucide/svelte/icons/book-text';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import DoorClosed from '@lucide/svelte/icons/door-closed';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import Home from '@lucide/svelte/icons/home';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import School from '@lucide/svelte/icons/school';
	import University from '@lucide/svelte/icons/university';
	import Users from '@lucide/svelte/icons/users';
	import X from '@lucide/svelte/icons/x';
	import { goto } from '$app/navigation';
	import { getMapStore, getSearchInfo } from '$lib/utils/context';
	import {
		buildingPreviewFromRow,
		entityHoverPreviewStore,
		eventPreviewFromRow
	} from '$lib/utils/entity/entity-hover-preview.svelte';
	// import { map, searchInfo } from '$lib/stores.svelte';
	import type { Building, EntityType, EventData } from '$lib/utils/types';
	import type { SearchInfoState } from '$lib/stores/store-types';
	import { getEntityCanonicalPath } from '$lib/utils/entity/entity-urls';
	import { resolve } from '$app/paths';

	let {
		value,
		category,
		entityId: id,
		index,
		eventSlug,
		building,
		event: eventData,
		secondary,
		recent
	}: {
		value: string;
		category: EntityType;
		entityId?: number;
		eventSlug?: string;
		building?: Building;
		event?: EventData;
		recent?: boolean;
		index?: number;
		/** Supporting line under the value, e.g. a room's unabbreviated name (#875). */
		secondary?: string | null;
	} = $props();

	const searchInfo = getSearchInfo();
	const map = getMapStore();

	// const appData = getAppData();
	// const { places } = $derived(appData());

	function handleSuggestionClick() {
		// entityHoverPreviewStore.hideNow();
		goto(resolve(`/map/${category}s/${id}`));
	}

	function handleRemoveRecent() {
		if (typeof index === 'undefined') return;
		searchInfo.removeRecentSearch(index);
	}

	// Hover preview for buildings and events (#288)
	function handleMouseEnter(event: MouseEvent) {
		if (category === 'building' && building) {
			const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
			entityHoverPreviewStore.show(buildingPreviewFromRow(building), {
				x: rect.right,
				y: rect.top + rect.height / 2
			});
		} else if (category === 'event' && eventData) {
			const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
			entityHoverPreviewStore.show(eventPreviewFromRow(eventData), {
				x: rect.right,
				y: rect.top + rect.height / 2
			});
		}
	}

	function handleMouseLeave() {
		entityHoverPreviewStore.scheduleHide();
	}

	function handleFocus(event: FocusEvent) {
		// Show preview on keyboard focus too
		handleMouseEnter(event as unknown as MouseEvent);
	}

	/** Match query in label; expand to word end so "Institute o" → "Institute of". */
	const labelParts = $derived.by(() => {
		const q = searchInfo.inputValue.trim();
		if (!q) return [{ text: value, matched: false }];
		const idx = value.toLowerCase().indexOf(q.toLowerCase());
		if (idx < 0) return [{ text: value, matched: false }];
		let end = idx + q.length;
		while (end < value.length && value[end] !== ' ') end += 1;
		const parts: { text: string; matched: boolean }[] = [];
		if (idx > 0) parts.push({ text: value.slice(0, idx), matched: false });
		parts.push({ text: value.slice(idx, end), matched: true });
		if (end < value.length) {
			parts.push({ text: value.slice(end), matched: false });
		}
		return parts;
	});

	const hasMatchHighlight = $derived(labelParts.some((p) => p.matched));
</script>

{#snippet icon(type: typeof category)}
	<span class="icon">
		{#if type === 'building'}
			<University size={20} />
		{:else if type === 'division'}
			<School size={20} />
		{:else if type === 'college'}
			<GraduationCap size={20} />
		{:else if type === 'room'}
			<DoorClosed size={20} />
			<!-- {:else if type === 'class'}
			<BookText size={20} /> -->
		{:else if type === 'dorm'}
			<Home size={20} />
		{:else if type === 'event'}
			<CalendarDays size={20} />
		{:else if type === 'organization'}
			<Users size={20} />
		{:else if type === 'place'}
			<MapPin size={20} />
		{:else}
			<MapPin size={20} />
		{/if}
	</span>
{/snippet}

<div class="suggestion-row">
	<button
		type="button"
		class="suggestion"
		onclick={handleSuggestionClick}
		onmouseenter={handleMouseEnter}
		onmouseleave={handleMouseLeave}
		onfocus={handleFocus}
	>
		{@render icon(category)}
		<div class="text">
			{#each labelParts as part, i (i)}
				<span class:match={part.matched} class:rest={hasMatchHighlight && !part.matched}
					>{part.text}</span
				>
			{/each}
			{#if secondary}
				<span class="text-secondary">{secondary}</span>
			{/if}
		</div>
		{#if typeof recent === 'undefined'}
			<ArrowUpRight size={18} class="icon trailing" />
		{/if}
	</button>
	{#if typeof recent !== 'undefined'}
		<button
			type="button"
			class="suggestion-remove"
			aria-label={`Remove ${value} from recent searches`}
			onmousedown={handleRemoveRecent}
		>
			<X size={18} aria-hidden="true" />
		</button>
	{/if}
</div>

<style>
	.suggestion-row {
		display: flex;
		align-items: stretch;
		gap: 0.125rem;
		border-radius: 0.5rem;
	}

	.suggestion-row:hover .suggestion,
	.suggestion-row:focus-within .suggestion {
		background-color: hsl(0, 0%, 95%);
	}

	.suggestion {
		all: unset;
		box-sizing: border-box;
		flex: 1;
		min-width: 0;
		padding: 0.4375rem 0.5rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		border-radius: 0.5rem;
	}

	@media (max-width: 48rem) {
		.suggestion {
			gap: 0.75rem;
			padding: 0.875rem 0.25rem;
			border-radius: 0;
		}

		.suggestion-row:hover .suggestion,
		.suggestion-row:focus-within .suggestion {
			background-color: transparent;
		}

		.suggestion-row:active .suggestion {
			background-color: hsl(0, 0%, 97%);
		}
	}

	.suggestion-remove {
		all: unset;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 2rem;
		cursor: pointer;
		border-radius: 0.5rem;
		color: #52525b;
	}

	.suggestion-remove:hover,
	.suggestion-remove:focus-visible {
		background-color: hsl(0, 0%, 90%);
		color: #18181b;
	}

	:global(.icon) {
		display: flex;
		align-items: center;
		justify-content: center;
		color: #18181b;
		flex-shrink: 0;
	}

	:global(.icon.trailing) {
		margin-left: auto;
	}

	.text {
		flex: 1 1 auto;
		min-width: 0;
		font-size: 0.875rem;
		color: #18181b;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.text-secondary {
		color: #52525b;
	}

	.text-secondary::before {
		content: ' · ';
	}

	.text .match {
		font-weight: 700;
		color: #18181b;
	}

	.text .rest {
		font-weight: 400;
		color: #8b8b96;
	}

	@media (max-width: 48rem) {
		.text {
			font-size: 0.9375rem;
		}
	}

	@media (max-width: 425px) {
		.suggestion {
			padding: 0.875rem 0.25rem;
		}
	}
</style>
