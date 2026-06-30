<script lang="ts">
  import { getAppData } from "@lib/context";
  import {
    getJSONFetch,
    searchLocalAliases,
    searchLocalRooms,
  } from "@lib/local/data/utils";
  import { buildEntitySuggestions } from "@lib/search-suggestions";
  import { queryStore, buildingTypeFilter } from "@lib/store.svelte";
  import {
    buildingMatchesTypeFilter,
    dormMatchesTypeFilter,
  } from "@constants/building-types";
  import SearchQuerySuggestion from "./SearchQuerySuggestion.svelte";
  import FinalExamSuggestion from "./FinalExamSuggestion.svelte";
  import Suggestion from "./Suggestion.svelte";
  import CampusBrowseChips from "./CampusBrowseChips.svelte";
  import KeyboardShortcutsChip from "@ui/map-chrome/KeyboardShortcutsChip.svelte";

  const appData = getAppData();
  const { buildings, colleges, divisions, dorms, events, loaded } =
    $derived(appData());

  const filteredDorms = $derived.by(() => {
    if (!loaded) return [];
    return dorms.filter((dorm) =>
      dormMatchesTypeFilter(dorm, buildingTypeFilter.value),
    );
  });
  const filteredBuildings = $derived.by(() => {
    if (!loaded) return [];
    return buildings.filter((building) =>
      buildingMatchesTypeFilter(building, buildingTypeFilter.value),
    );
  });

  const suggestedResult = $derived.by(() =>
    buildEntitySuggestions(queryStore.inputValue, {
      loaded,
      filteredBuildings,
      filteredDorms,
      colleges,
      divisions,
      events,
    }),
  );

  type AliasHit = { alias: string; value: string };
  type RoomHit = { value: string; category: "room" };

  let aliasResults = $state<AliasHit[]>([]);
  let roomResults = $state<RoomHit[]>([]);
  let roomLoading = $state(false);

  $effect(() => {
    const trimmed = queryStore.inputValue.trim();
    if (trimmed === "") {
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
          .filter((entry): entry is { alias: string; value: string } =>
            Boolean(entry.value),
          )
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
    const trimmed = queryStore.inputValue.trim();
    if (trimmed === "") {
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
          data?: { value: string }[] | null;
        };
        if (cancelled) return;
        if (response.ok && Array.isArray(roomsFetch?.data)) {
          roomResults = roomsFetch.data.map((val) => ({
            ...val,
            category: "room" as const,
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
        ? local.map((val) => ({ ...val, category: "room" as const }))
        : [];
      roomLoading = false;
    })();

    return () => {
      cancelled = true;
    };
  });
</script>

<!-- class:visible={queryStore.inputValue === ""} -->
<div
  class="suggestions-container search-suggestions"
  onmousedown={(event) => event.preventDefault()}
>
  <!-- class:force-visible={queryStore.inputValue === ""} -->
  {#if queryStore.inputValue === ""}
    <CampusBrowseChips />
    <div class="suggestions-toolbar">
      <KeyboardShortcutsChip compact />
    </div>
    {#if queryStore.recentSearches.length !== 0}
      <h2 class="suggestions-header">Recent searches</h2>
      {#each queryStore.recentSearches as { category, value, eventSlug }, id (id)}
        <Suggestion {value} {category} {id} {eventSlug} />
      {/each}
    {:else}
      <h2 class="suggestions-header">Trending searches</h2>
      <Suggestion value="Physical Sciences Building" category="building" />
      <Suggestion value="Institute of Computer Science" category="division" />
      <Suggestion
        value="Institute of Biological Sciences"
        category="division"
      />
      <Suggestion
        value="College of Engineering and Agro-Industrial Technology"
        category="college"
      />
    {/if}
  {:else if suggestedResult.length !== 0}
    {#each suggestedResult as suggestion, id (id)}
      <Suggestion {...suggestion} />
    {/each}
  {/if}

  {#if queryStore.inputValue !== ""}
    {#each aliasResults as alias (alias.value)}
      {#if !suggestedResult.some((s) => s.category === "building" && s.value === alias.value)}
        <div class="alias-hint">
          Showing results for <strong>{alias.alias}</strong> &rarr;
          {alias.value}
        </div>
        <Suggestion value={alias.value} category="building" />
      {/if}
    {/each}
  {/if}

  {#if queryStore.inputValue !== ""}
    {#if roomLoading}
      <p class="suggestions-status" aria-live="polite">Loading rooms…</p>
    {:else}
      {#each roomResults as roomResult (roomResult.value)}
        <Suggestion {...roomResult} />
      {/each}
    {/if}
  {/if}

  {#if suggestedResult.length === 0 && queryStore.inputValue !== "" && !roomLoading}
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

  .suggestions-toolbar {
    display: flex;
    justify-content: flex-start;
    padding: 0 0.5rem 0.25rem;
  }

  .suggestions-header {
    margin: 0;
    padding: 0.125rem 0.5rem 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: hsl(0, 0%, 45%);
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
