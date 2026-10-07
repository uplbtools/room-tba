<script lang="ts">
	import LoadingIndicator from '$lib/components/LoadingIndicator.svelte';
	// import {
	// 	buildingMatchesTypeFilter,
	// 	dormMatchesTypeFilter
	// } from '$lib/constants/content/categories/building';
	// import { getJSONFetch, searchLocalAliases, searchLocalRooms } from '$lib/utils/local/data/utils';
	// import { buildEntitySuggestions } from '$lib/utils/search-suggestions';
	// import { buildingTypeFilter } from '$lib/stores.svelte';
	// import FinalExamSuggestion from './FinalExamSuggestion.svelte';
	// import SearchQuerySuggestion from './SearchQuerySuggestion.svelte';
	import Suggestion from './Suggestion.svelte';
	import { getSearchInfo } from '$lib/utils/context';
	import { getUnionSuggestions } from '$lib/functions/search.remote';

	const searchInfo = getSearchInfo();

	const suggestionsPromise = $derived.by(() => {
		if (!searchInfo.hasQuery()) return [];
		return getUnionSuggestions(searchInfo.queryValue);
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
{#if searchInfo.isSearchMode() && searchInfo.hasQuery()}
	<div
		class="suggestions-container search-suggestions absolute top-full left-0 w-full bg-white"
		onmousedown={(event) => event.preventDefault()}
	>
		<!-- {:else if suggestedResult.length !== 0} -->
		{#each await suggestionsPromise as { id, name, type }, index (index)}
			<Suggestion category={type} value={name} entityId={id} />
		{/each}
		<!-- {#if searchInfo.recentSearches.length !== 0}
		<h2 class="suggestions-header">Recent searches</h2> -->
		<!-- Normalize search schema data -->
		<!-- {#each searchInfo.recentSearches as { category, value, eventSlug, id }, index (index)}
			<Suggestion {value} {category} {eventSlug} entityId={id} recent={true} {index} />
		{/each} -->
		<!-- {/if} -->

		<!-- Implement search query suggestion search -->
	</div>
{/if}

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
