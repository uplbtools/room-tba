<script lang="ts">
  import { getAppData } from "../../../lib/context";
  import { getJSONFetch } from "../../../lib/local/data/utils";
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
  import EventCards from "./EventCards.svelte";
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
    const uriSearch = encodeURI(searchValue.toUpperCase());
    const roomsFetch = await getJSONFetch<{ data: { value: string }[] | null }>(
      `/api/rooms?search_code=${uriSearch}`,
    );

    return roomsFetch.data
      ? roomsFetch.data.map((val) => ({ ...val, category: "room" as const }))
      : [];
  }
</script>

<!-- class:visible={queryStore.inputValue === ""} -->
<div class="suggestions-container">
  <!-- class:force-visible={queryStore.inputValue === ""} -->
  {#if queryStore.inputValue === ""}
    <div class="dropdown-events">
      <EventCards headingId="dropdown-events-heading" />
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
  .dropdown-events {
    margin-bottom: 0.75rem;
  }
  @media (max-width: 425px) {
    .suggestions-header {
      margin-bottom: 0.25rem;
    }
  }
</style>
