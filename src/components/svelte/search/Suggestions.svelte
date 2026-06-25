<script lang="ts">
  import { getAppData } from "../../../lib/context";
  import { getJSONFetch } from "../../../lib/local/data/utils";
  import {
    queryStore,
    type QueryStoreState,
    dormFilter,
    type DormFilterType,
    buildingTypeFilter,
  } from "../../../lib/store.svelte";
  import type { BuildingData, DormData } from "../../../lib/types";
  import SearchQuerySuggestion from "./SearchQuerySuggestion.svelte";
  import Suggestion from "./Suggestion.svelte";

  const appData = getAppData();
  const { buildings, colleges, divisions, dorms, loaded } = $derived(appData());

  const filteredDorms = $derived.by(() => {
    if (!loaded) return;
    if (dormFilter.value === "all") return dorms;
    if (dormFilter.value === "up") return dorms.filter((d) => d.isUpManaged);
    return dorms.filter((d) => !d.isUpManaged);
  });
  const filteredBuildings = $derived.by(() => {
    if (!loaded) return;
    if (buildingTypeFilter.value === "all") return buildings;
    return buildings.filter(
      (building) => building.buildingType === buildingTypeFilter.value,
    );
  });

  const suggestedResult = $derived(getSuggestions(queryStore.inputValue));

  function getSuggestions(searchString: string): {
    value: string;
    category: Exclude<QueryStoreState["category"], null>;
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
    } satisfies {
      [key: string]: {
        value: string;
        category: Exclude<QueryStoreState["category"], null>;
      }[];
    };

    const nonRoomResult = Object.values(suggestions)
      .flat()
      .sort(({ value: a }, { value: b }) =>
        a.toLowerCase().localeCompare(b.toLowerCase()),
      );

    return nonRoomResult.slice(0, 8);
  }

  const hasDormResults = $derived(suggestedResult);
  const roomsResult = $derived(getRoomSuggestions(queryStore.inputValue));

  async function getRoomSuggestions(searchValue: string) {
    const uriSearch = encodeURI(searchValue.toUpperCase());
    const roomsFetch = await getJSONFetch<{ data: { value: string }[] | null }>(
      `/api/rooms?search_code=${uriSearch}`,
    );

    return roomsFetch.data
      ? roomsFetch.data.map((val) => ({ ...val, category: "room" as const }))
      : [];
  }

  const filterOptions: { label: string; value: DormFilterType }[] = [
    { label: "All", value: "all" },
    { label: "UP-managed", value: "up" },
    { label: "Private", value: "private" },
  ];
</script>

<!-- class:visible={queryStore.inputValue === ""} -->
<div class="suggestions-container">
  <!-- class:force-visible={queryStore.inputValue === ""} -->
  {#if queryStore.inputValue === ""}
    {#if queryStore.recentSearches.length !== 0}
      <h2 class="suggestions-header">Recent searches</h2>
      {#each queryStore.recentSearches as { category, value }, id (id)}
        <Suggestion {value} {category} {id} />
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
    {#if hasDormResults}
      <div class="filter-chips">
        {#each filterOptions as opt (opt.value)}
          <button
            class="filter-chip"
            class:active={dormFilter.value === opt.value}
            onclick={() => dormFilter.set(opt.value)}
          >
            {opt.label}
          </button>
        {/each}
      </div>
    {/if}
    {#each suggestedResult as suggestion, id (id)}
      <Suggestion {...suggestion} />
    {/each}
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
    position: absolute;
    width: 100%;
    height: max-content;
    border-radius: 1rem;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    background-color: white;
    pointer-events: none;
    box-shadow: 0rem 2px 0.25rem 0rem rgba(0, 0, 0, 0.25);
    margin-top: 0.5rem;
    opacity: 0;
  }
  /* .force-visible {
    opacity: 1;
    pointer-events: auto;
  } */
  .suggestions-header {
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }

  .filter-chips {
    display: flex;
    gap: 0.375rem;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
  }

  .filter-chip {
    all: unset;
    cursor: pointer;
    padding: 0.25rem 0.625rem;
    border-radius: 1rem;
    font-size: 0.6875rem;
    font-weight: 600;
    background-color: hsl(0, 0%, 94%);
    color: hsl(0, 0%, 40%);
    transition: all 0.15s;
  }

  .filter-chip:hover {
    background-color: hsl(0, 0%, 88%);
  }

  .filter-chip.active {
    background-color: hsl(5, 53%, 30%);
    color: white;
  }

  @media (max-width: 425px) {
    .suggestions-header {
      margin-bottom: 0.25rem;
    }
  }
</style>
