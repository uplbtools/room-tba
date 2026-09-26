<script lang="ts">
	import LoadingIndicator from '$lib/components/LoadingIndicator.svelte';
	import {
		buildingMatchesTypeFilter,
		dormMatchesTypeFilter
	} from '$lib/constants/content/categories/building';
	import { getAppData } from '$lib/utils/context';
	import { getJSONFetch, searchLocalAliases, searchLocalRooms } from '$lib/utils/local/data/utils';
	import { buildEntitySuggestions } from '$lib/utils/search-suggestions';
	import { buildingTypeFilter, classVenuesStore, searchInfo } from '$lib/stores.svelte';
	import FinalExamSuggestion from './FinalExamSuggestion.svelte';
	import SearchQuerySuggestion from './SearchQuerySuggestion.svelte';
	import Suggestion from './Suggestion.svelte';

	const appData = getAppData();
	const { buildings, colleges, divisions, dorms, events, organizations, places, loaded } =
		$derived(appData());

	const filteredDorms = $derived.by(() => {
		if (!loaded) return [];
		return dorms.filter((dorm) => dormMatchesTypeFilter(dorm, buildingTypeFilter.value));
	});
	const filteredBuildings = $derived.by(() => {
		if (!loaded) return [];
		return buildings.filter((building) =>
			buildingMatchesTypeFilter(
				building,
				buildingTypeFilter.value,
				classVenuesStore.buildingIdsWithClasses
			)
		);
	});

	const suggestedResult = $derived.by(() =>
		buildEntitySuggestions(searchInfo.inputValue, {
			loaded,
			filteredBuildings,
			filteredDorms,
			colleges: colleges ?? [],
			divisions: divisions ?? [],
			events: events ?? [],
			organizations: organizations ?? [],
			places: places ?? []
		})
	);

	type AliasHit = { alias: string; value: string };
	type RoomHit = {
		value: string;
		category: 'room';
		fullName?: string | null;
		id: number;
	};

	let aliasResults = $state<AliasHit[]>([]);
	let roomResults = $state<RoomHit[]>([]);
	let roomLoading = $state(false);

	$effect(() => {
		const trimmed = searchInfo.inputValue.trim();
		if (trimmed === '') {
			aliasResults = [];
			return;
		}

		let cancelled = false;
		void (async () => {
			try {
				const res = await getJSONFetch<{
					data: { alias: string; value: string | null }[];
				}>(`/api/aliases?q=${encodeURIComponent(trimmed)}`);
				if (cancelled) return;
				aliasResults = (res.data ?? [])
					.filter((entry): entry is { alias: string; value: string } => Boolean(entry.value))
					.map((entry) => ({ alias: entry.alias, value: entry.value }));
			} catch {
				if (cancelled) return;
				aliasResults = await searchLocalAliases(trimmed);
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		const trimmed = searchInfo.inputValue.trim();
		if (trimmed === '') {
			roomResults = [];
			roomLoading = false;
			return;
		}

		let cancelled = false;
		roomLoading = true;
		void (async () => {
			const upper = trimmed.toUpperCase();
			const url = `/api/rooms?search_code=${encodeURI(upper)}`;
			try {
				const response = await fetch(url);
				const roomsFetch = (await response.json()) as {
					data?: { value: string; fullName?: string | null; id: number }[] | null;
				};
				if (cancelled) return;
				if (response.ok && Array.isArray(roomsFetch?.data)) {
					roomResults = roomsFetch.data.map((val) => ({
						...val,
						category: 'room' as const,
						id: val.id
					}));
					roomLoading = false;
					return;
				}
				if (response.status === 404) {
					roomResults = [];
					roomLoading = false;
					return;
				}
			} catch {
				// Network unavailable — fall back to the local PGlite room cache (#169).
			}

			if (cancelled) return;
			const local = await searchLocalRooms(upper);
			roomResults = local
				? local.map((val) => ({ ...val, category: 'room' as const, id: val.id }))
				: [];
			roomLoading = false;
		})();

		return () => {
			cancelled = true;
		};
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="suggestions-container search-suggestions"
	onmousedown={(event) => event.preventDefault()}
>
	{#if searchInfo.inputValue === ''}
		{#if searchInfo.recentSearches.length !== 0}
			<h2 class="suggestions-header">Recent searches</h2>
			{#each searchInfo.recentSearches as { category, value, eventSlug, id }, index (index)}
				<Suggestion {value} {category} {eventSlug} entityId={id} recent={true} {index} />
			{/each}
		{/if}
	{:else if suggestedResult.length !== 0}
		{#each suggestedResult as suggestion, id (id)}
			<Suggestion {...suggestion} />
		{/each}
	{/if}

	{#if searchInfo.inputValue !== ''}
		{#each aliasResults as alias (alias.value)}
			{#if !suggestedResult.some((s) => s.category === 'building' && s.value === alias.value)}
				<div class="alias-hint">
					Showing results for <strong>{alias.alias}</strong> &rarr;
					{alias.value}
				</div>
				<Suggestion value={alias.value} category="building" />
			{/if}
		{/each}
	{/if}

	{#if searchInfo.inputValue !== ''}
		{#if roomLoading}
			<p class="suggestions-status">
				<LoadingIndicator label="Loading rooms…" />
			</p>
		{:else}
			{#each roomResults as roomResult (roomResult.value)}
				<Suggestion
					value={roomResult.value}
					category={roomResult.category}
					secondary={roomResult.fullName}
					entityId={roomResult.id}
				/>
			{/each}
		{/if}
	{/if}

	{#if suggestedResult.length === 0 && searchInfo.inputValue !== '' && !roomLoading}
		<FinalExamSuggestion onSelect={() => {}} />
		<SearchQuerySuggestion />
	{/if}
</div>

<style>
	.suggestions-container {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.375rem 0.5rem 0.625rem;
		border-top: 1px solid hsl(0, 0%, 90%);
		max-height: min(50vh, 18rem);
		overflow-y: auto;
		overscroll-behavior: contain;
		contain: layout style;
	}

	@media (max-width: 48rem) {
		.suggestions-container {
			gap: 0;
			padding: 0.125rem 0 0.5rem;
			border-top: none;
		}

		.suggestions-header {
			padding: 0.5rem 0.25rem;
			font-size: 0.75rem;
		}
	}

	.suggestions-header {
		margin: 0;
		padding: 8px;
		font-family: Inter, system-ui, sans-serif;
		font-size: 14px;
		font-weight: 700;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		color: #7b7c8d;
	}

	@media (min-width: 48.0625rem) {
		.suggestions-container {
			gap: 0;
			padding: 16px 20px;
			border-top: none;
			max-height: min(60vh, 28rem);
		}
	}

	.alias-hint {
		padding: 0.125rem 0.5rem;
		font-size: 0.75rem;
		color: hsl(0, 0%, 45%);
	}

	.alias-hint strong {
		color: hsl(5, 53%, 32%);
	}

	.suggestions-status {
		margin: 0;
		padding: 0.5rem 0.75rem;
		font-size: 0.8125rem;
		color: hsl(0, 0%, 45%);
	}
</style>
