<script lang="ts">
  import { getAppData } from "../../../lib/context";
  import {
    getJSONFetch,
    searchLocalRooms,
  } from "../../../lib/local/data/utils";
  import {
    queryStore,
    type QueryStoreState,
    buildingTypeFilter,
  } from "../../../lib/store.svelte";
  import type { BuildingData, DormData, EventData } from "../../../lib/types";
  import {
    buildingMatchesTypeFilter,
    dormMatchesTypeFilter,
  } from "../../../constants/building-types";
  import SearchQuerySuggestion from "./SearchQuerySuggestion.svelte";
  import Suggestion from "./Suggestion.svelte";

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

  const suggestedResult = $derived(getSuggestions(queryStore.inputValue));
  function getSuggestions(searchString: string): {
    value: string;
    category: Exclude<QueryStoreState["category"], null>;
    eventSlug?: string;
  }[] {
    searchString = searchString.trim().toLowerCase();
    if (searchString === "" || !loaded) return [];
    const suggestions = {
      buildings: (filteredBuildings as BuildingData[])
        .filter(({ buildingName }) =>
          buildingName.toLowerCase().includes(searchString),
        )
        .map(({ buildingName }) => ({
          value: buildingName,
          category: "building",
        })),
      colleges: colleges
        .filter(({ collegeName }) =>
          collegeName.toLowerCase().includes(searchString),
        )
        .map(({ collegeName }) => ({
          value: collegeName,
          category: "college",
        })),
      divisions: divisions
        .filter(({ divisionName }) =>
          divisionName.toLowerCase().includes(searchString),
        )
        .map(({ divisionName }) => ({
          value: divisionName,
          category: "division",
        })),
      dorms: (filteredDorms as DormData[])
        .filter(
          ({ dormName, shortName }) =>
            dormName.toLowerCase().includes(searchString) ||
            (shortName && shortName.toLowerCase().includes(searchString)),
        )
        .map(({ dormName }) => ({
          value: dormName,
          category: "dorm",
        })),
      events: (events as EventData[])
        .filter(
          ({ title, description }) =>
            title.toLowerCase().includes(searchString) ||
            (description && description.toLowerCase().includes(searchString)),
        )
        .map(({ title, slug }) => ({
          value: title,
          category: "event",
          eventSlug: slug,
        })),
    } satisfies {
      [key: string]: {
        value: string;
        category: Exclude<QueryStoreState["category"], null>;
        eventSlug?: string;
      }[];
    };

    const nonRoomResult = Object.values(suggestions)
      .flat()
      .sort(({ value: a }, { value: b }) =>
        a.toLowerCase().localeCompare(b.toLowerCase()),
      );

    return nonRoomResult.slice(0, 8);
  }
  const roomsResult = $derived(getRoomSuggestions(queryStore.inputValue));

  async function getRoomSuggestions(searchValue: string) {
    const trimmed = searchValue.trim();
    if (trimmed === "") return [];
    const upper = trimmed.toUpperCase();
    try {
      const roomsFetch = await getJSONFetch<{
        data: { value: string }[] | null;
      }>(`/api/rooms?search_code=${encodeURI(upper)}`);
      if (roomsFetch.data && roomsFetch.data.length > 0) {
        return roomsFetch.data.map((val) => ({
          ...val,
          category: "room" as const,
        }));
      }
    } catch {
      // Network unavailable — fall back to the local PGlite room cache (#169).
    }
    const local = await searchLocalRooms(upper);
    return local
      ? local.map((val) => ({ ...val, category: "room" as const }))
      : [];
  }

  const aliasResult = $derived(getAliasSuggestions(queryStore.inputValue));

  // Resolve search aliases/synonyms (e.g. "PhySci" -> Physical Sciences
  // Building) to their building targets, with the matched alias for a hint (#155).
  async function getAliasSuggestions(
    searchValue: string,
  ): Promise<{ alias: string; value: string }[]> {
    const trimmed = searchValue.trim();
    if (trimmed === "") return [];
    try {
      const res = await getJSONFetch<{
        data: { alias: string; value: string | null }[];
      }>(`/api/aliases?q=${encodeURIComponent(trimmed)}`);
      return (res.data ?? [])
        .filter((entry): entry is { alias: string; value: string } =>
          Boolean(entry.value),
        )
        .map((entry) => ({ alias: entry.alias, value: entry.value }));
    } catch {
      return [];
    }
  }
</script>

<!-- class:visible={queryStore.inputValue === ""} -->
<div class="suggestions-container">
  <!-- class:force-visible={queryStore.inputValue === ""} -->
  {#if queryStore.inputValue === ""}
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
    {#await aliasResult then aliases}
      {#each aliases as alias (alias.value)}
        {#if !suggestedResult.some((s) => s.category === "building" && s.value === alias.value)}
          <div class="alias-hint">
            Showing results for <strong>{alias.alias}</strong> &rarr;
            {alias.value}
          </div>
          <Suggestion value={alias.value} category="building" />
        {/if}
      {/each}
    {/await}
  {/if}

  {#if queryStore.inputValue !== ""}
    {#await roomsResult}
      Loading rooms...
    {:then result}
      {#each result as roomResult (roomResult.value)}
        <Suggestion {...roomResult} />
      {/each}
    {/await}
  {/if}
  {#if suggestedResult.length === 0 && queryStore.inputValue !== ""}
    <SearchQuerySuggestion />
  {/if}
</div>

<style>
  .suggestions-container {
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.375rem 0.5rem 0.625rem;
    border-top: 1px solid hsl(0, 0%, 90%);
    max-height: min(50vh, 18rem);
    overflow-y: auto;
    overscroll-behavior: contain;
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
</style>
