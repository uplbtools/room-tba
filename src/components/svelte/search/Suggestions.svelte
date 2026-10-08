<script lang="ts">
  import LoadingIndicator from "@ui/LoadingIndicator.svelte";
  import MapFilterChips from "@ui/map-chrome/MapFilterChips.svelte";
  import LocateFixed from "@lucide/svelte/icons/locate-fixed";
  import { getAppData } from "@lib/context";
  import {
    getJSONFetch,
    searchLocalAliases,
    searchLocalRooms,
  } from "@lib/local/data/utils";
  import { isLocalCacheReady } from "@lib/local/data/pgliteDB";
  import { fetchClassPage } from "@lib/classes-api";
  import {
    EXPANDED_LIMITS,
    enterAction,
    groupSuggestions,
    normalizeCourseQuery,
    rankSuggestions,
    scoreAliases,
    scoreClasses,
    scoreEntities,
    scoreRooms,
  } from "@lib/search-suggestions";
  import { openCourseClasses, selectSuggestion } from "@lib/search-select";
  import { searchTrail } from "@lib/makiling-trail";
  import {
    appBootstrapStore,
    buildingTypeFilter,
    classVenuesStore,
    directionsStore,
    locationStore,
    mapStore,
    queryStore,
    termStore,
  } from "@lib/store.svelte";
  import type { ClassMapValue } from "@lib/types";
  import {
    buildingMatchesTypeFilter,
    dormMatchesTypeFilter,
  } from "@constants/building-types";
  import SearchQuerySuggestion from "./SearchQuerySuggestion.svelte";
  import FinalExamSuggestion from "./FinalExamSuggestion.svelte";
  import Suggestion from "./Suggestion.svelte";
  import { savedPlaces } from "@lib/saved-places.svelte";

  let { onDismiss = () => {} }: { onDismiss?: () => void } = $props();

  /** A search fetch that hangs must not leave "Loading…" up forever. */
  const SEARCH_FETCH_TIMEOUT_MS = 8_000;
  /** Saved places shown above Recent before typing; the rest live in Saved. */
  const SAVED_PREVIEW = 5;
  /** Longest Enter waits on a slow source before opening the top result. */
  const ENTER_WAIT_MS = 2_000;

  const appData = getAppData();
  const {
    buildings,
    colleges,
    divisions,
    dorms,
    events,
    organizations,
    places,
    loaded,
  } = $derived(appData());

  const filteredDorms = $derived.by(() => {
    if (!loaded) return [];
    return dorms.filter((dorm) =>
      dormMatchesTypeFilter(dorm, buildingTypeFilter.value),
    );
  });
  const filteredBuildings = $derived.by(() => {
    if (!loaded) return [];
    return buildings.filter((building) =>
      buildingMatchesTypeFilter(
        building,
        buildingTypeFilter.value,
        classVenuesStore.buildingIdsWithClasses,
      ),
    );
  });

  const query = $derived(queryStore.inputValue.trim());

  type AliasHit = { alias: string; value: string };
  type RoomHit = { value: string; fullName?: string | null };

  // Each async source remembers which query its results belong to, so "still
  // searching" is exact: a source is settled once it answered this query.
  let aliasResults = $state<AliasHit[]>([]);
  let aliasFor = $state("");
  let roomResults = $state<RoomHit[]>([]);
  let roomFor = $state("");
  let classResults = $state<ClassMapValue[]>([]);
  let classFor = $state("");

  $effect(() => {
    const trimmed = query;
    if (trimmed === "") {
      aliasResults = [];
      aliasFor = "";
      return;
    }

    let cancelled = false;
    void (async () => {
      let hits: AliasHit[];
      try {
        const res = await getJSONFetch<{
          data: { alias: string; value: string | null }[];
        }>(
          `/api/aliases?q=${encodeURIComponent(trimmed)}`,
          SEARCH_FETCH_TIMEOUT_MS,
        );
        hits = (res.data ?? [])
          .filter((entry): entry is AliasHit => Boolean(entry.value))
          .map((entry) => ({ alias: entry.alias, value: entry.value }));
      } catch {
        // Offline: only ask the local cache if it is already up; booting it
        // here is what kept search spinning on a cold second tab.
        hits = isLocalCacheReady() ? await searchLocalAliases(trimmed) : [];
      }
      if (cancelled) return;
      aliasResults = hits;
      aliasFor = trimmed;
    })();

    return () => {
      cancelled = true;
    };
  });

  $effect(() => {
    const trimmed = query;
    if (trimmed === "") {
      roomResults = [];
      roomFor = "";
      return;
    }

    let cancelled = false;
    void (async () => {
      const upper = trimmed.toUpperCase();
      let hits: RoomHit[] | null = null;
      try {
        const response = await fetch(
          `/api/rooms?search_code=${encodeURIComponent(upper)}`,
          { signal: AbortSignal.timeout(SEARCH_FETCH_TIMEOUT_MS) },
        );
        if (response.ok) {
          const body = (await response.json()) as { data?: RoomHit[] | null };
          // `data: null` is the server's "no rooms match", not a failure.
          hits = Array.isArray(body?.data) ? body.data : [];
        } else if (response.status === 404) {
          hits = [];
        }
      } catch {
        // Network unavailable — fall back to the local room cache (#169).
      }
      if (hits === null) {
        hits = isLocalCacheReady() ? ((await searchLocalRooms(upper)) ?? []) : [];
      }
      if (cancelled) return;
      roomResults = hits;
      roomFor = trimmed;
    })();

    return () => {
      cancelled = true;
    };
  });

  $effect(() => {
    const trimmed = query;
    const course = normalizeCourseQuery(trimmed);
    const termId = termStore.activeTermId;
    if (!course) {
      classResults = [];
      classFor = trimmed;
      return;
    }

    let cancelled = false;
    void fetchClassPage({
      termId,
      courseCodePrefix: course,
      limit: 12,
      timeoutMs: SEARCH_FETCH_TIMEOUT_MS,
    })
      .then((page) => page.rows)
      .catch(() => [] as ClassMapValue[])
      .then((rows) => {
        if (cancelled) return;
        classResults = rows;
        classFor = trimmed;
      });

    return () => {
      cancelled = true;
    };
  });

  // Enter on an ambiguous query lists every match; typing again resets it.
  let expanded = $state(false);
  let expandedFor = "";
  $effect(() => {
    if (query !== expandedFor) expanded = false;
  });

  const ranked = $derived.by(() => {
    if (query === "") return [];
    return rankSuggestions(
      [
        ...scoreEntities(query, {
          loaded,
          filteredBuildings,
          filteredDorms,
          colleges,
          divisions,
          events,
          organizations,
          places,
        }),
        ...(aliasFor === query
          ? scoreAliases(query, aliasResults, filteredBuildings)
          : []),
        ...(roomFor === query ? scoreRooms(query, roomResults) : []),
        ...(classFor === query ? scoreClasses(query, classResults) : []),
        ...searchTrail(query).map((hit) => ({
          value: hit.label,
          category: "trail" as const,
          secondary: hit.secondary,
          score: hit.score,
          trailStopId: hit.stopId,
          lat: hit.lat,
          lon: hit.lon,
        })),
      ],
      expanded ? EXPANDED_LIMITS : {},
    );
  });
  const groups = $derived(groupSuggestions(ranked));

  // `loaded` flips on at mount with empty arrays; campus rows are only in once
  // a snapshot or the network load is applied (or the load gave up).
  const campusDataReady = $derived(
    loaded &&
      (appBootstrapStore.hasCachedData ||
        appBootstrapStore.phase === "sync" ||
        appBootstrapStore.phase === "ready" ||
        appBootstrapStore.phase === "error"),
  );

  const searching = $derived(
    query !== "" &&
      (!campusDataReady ||
        aliasFor !== query ||
        roomFor !== query ||
        classFor !== query),
  );

  const courseCode = $derived(
    ranked.find((s) => s.category === "class")?.courseCode ?? null,
  );

  let enterPending = $state(false);
  /** Set when Enter has waited long enough: act on what has answered. */
  let enterWaited = $state(false);
  let enterQuery = "";
  let enterTimer: ReturnType<typeof setTimeout> | undefined;

  function runEnter() {
    const action = enterAction(ranked);
    if (action.kind === "select") selectSuggestion(action.suggestion);
    else if (action.kind === "course") openCourseClasses(action.courseCode);
    else if (action.kind === "expand") {
      expanded = true;
      expandedFor = query;
    }
  }

  /**
   * Enter in the search box: waits for in-flight sources, then acts. A slow
   * source gets ENTER_WAIT_MS; after that Enter acts on what has answered
   * instead of looking dead.
   */
  export function handleEnter() {
    if (query === "") return;
    enterQuery = query;
    enterPending = true;
    enterWaited = false;
    clearTimeout(enterTimer);
    enterTimer = setTimeout(() => {
      enterWaited = true;
    }, ENTER_WAIT_MS);
  }

  $effect(() => {
    if (!enterPending) return;
    if (searching && !(enterWaited && ranked.length !== 0)) return;
    enterPending = false;
    clearTimeout(enterTimer);
    runEnter();
  });

  // Typing again cancels an Enter that was waiting on results.
  $effect(() => {
    if (query !== enterQuery) {
      enterQuery = query;
      enterPending = false;
      clearTimeout(enterTimer);
    }
  });

  $effect(() => () => clearTimeout(enterTimer));

  const showShortcuts = $derived(!directionsStore.active);

  // "Your location" only once the browser already granted it; asking for
  // permission from an empty search box would be a surprise prompt.
  let locationGranted = $state(false);
  $effect(() => {
    if (!navigator.permissions?.query) return;
    let status: PermissionStatus | null = null;
    const sync = () => {
      locationGranted = status?.state === "granted";
    };
    void navigator.permissions
      .query({ name: "geolocation" })
      .then((result) => {
        status = result;
        sync();
        result.addEventListener("change", sync);
      })
      .catch(() => {});
    return () => status?.removeEventListener("change", sync);
  });
  const showYourLocation = $derived(
    showShortcuts && (locationStore.coords !== null || locationGranted),
  );

  function goToMyLocation() {
    onDismiss();
    const coords = locationStore.coords;
    if (!coords) {
      locationStore.requestLocation();
      return;
    }
    mapStore.mapInstance?.flyTo({ center: coords, zoom: 17, duration: 1200 });
  }
</script>

<div
  class="suggestions-container search-suggestions"
  onmousedown={(event) => event.preventDefault()}
>
  {#if query === ""}
    {#if showShortcuts}
      <div class="suggestions-shortcuts">
        <MapFilterChips />
      </div>
      {#if showYourLocation}
        <button type="button" class="suggestions-action" onclick={goToMyLocation}>
          <span class="suggestions-action__icon" aria-hidden="true">
            <LocateFixed size={20} />
          </span>
          Your location
        </button>
      {/if}
    {/if}
    {#if savedPlaces.items.length !== 0}
      <h2 class="suggestions-header">Saved</h2>
      {#each savedPlaces.items.slice(0, SAVED_PREVIEW) as place (`${place.category}:${place.value}`)}
        <Suggestion
          value={place.value}
          category={place.category}
          secondary={place.subtitle}
          lat={place.lat ?? null}
          lon={place.lon ?? null}
        />
      {/each}
    {/if}
    {#if queryStore.recentSearches.length !== 0}
      <div class="suggestions-header-row">
        <h2 class="suggestions-header">Recent</h2>
        <button
          type="button"
          class="suggestions-clear"
          onclick={queryStore.clearRecentSearches}
        >
          Clear
        </button>
      </div>
      {#each queryStore.recentSearches as { category, value, eventSlug }, id (id)}
        <Suggestion {value} {category} {id} {eventSlug} />
      {/each}
    {:else if savedPlaces.items.length === 0}
      <!-- First visit: an empty white screen gave no hint what search takes. -->
      <p class="suggestions-status suggestions-hint">
        Search a room code like ICS MH1, a building, dorm, office, student
        org, or event.
      </p>
    {/if}
  {:else if ranked.length !== 0}
    {#each groups as group (group.label)}
      {#if group.label}
        <h2 class="suggestions-header suggestions-group">{group.label}</h2>
      {/if}
      {#each group.items as suggestion (`${suggestion.category}:${suggestion.eventSlug ?? suggestion.trailStopId ?? suggestion.value}`)}
        <Suggestion {...suggestion} />
      {/each}
      {#if courseCode && group.items.some((s) => s.category === "class")}
        <button
          type="button"
          class="suggestions-action suggestions-action--link"
          onclick={() => courseCode && openCourseClasses(courseCode)}
        >
          See all {courseCode} classes
        </button>
        <FinalExamSuggestion onSelect={() => {}} />
      {/if}
    {/each}
    {#if searching}
      <p class="suggestions-status suggestions-status--inline">
        <LoadingIndicator label="Searching…" />
      </p>
    {/if}
  {:else if searching}
    <p class="suggestions-status">
      <LoadingIndicator
        label={campusDataReady ? "Searching…" : "Loading campus data…"}
      />
    </p>
  {:else}
    <div class="suggestions-empty" role="status">
      <p class="suggestions-empty__title">No results for “{query}”</p>
      <p class="suggestions-empty__hint">
        Check the spelling, try a room code like PS 105, or search classes
        instead.
      </p>
    </div>
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
    border-top: 1px solid var(--theme-border, hsl(0, 0%, 90%));
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
    color: var(--theme-text-muted, #7b7c8d);
  }

  .suggestions-group {
    padding-block: 0.5rem 0.125rem;
    font-size: 0.6875rem;
  }

  .suggestions-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .suggestions-clear {
    all: unset;
    box-sizing: border-box;
    min-height: 2.75rem;
    padding: 0 0.5rem;
    display: flex;
    align-items: center;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--color-brand, var(--theme-accent-text, #8d1437));
    cursor: pointer;
    border-radius: 0.5rem;
  }

  .suggestions-clear:hover,
  .suggestions-clear:focus-visible {
    background-color: var(--theme-surface-2, hsl(0, 0%, 95%));
  }

  .suggestions-shortcuts {
    min-width: 0;
    padding-block: 0.25rem 0.375rem;
  }

  .suggestions-action {
    all: unset;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-height: 2.75rem;
    padding: 0.5rem 0.25rem;
    font-size: 0.9375rem;
    color: var(--theme-text, #18181b);
    cursor: pointer;
    border-radius: 0.5rem;
  }

  .suggestions-action:hover,
  .suggestions-action:focus-visible {
    background-color: var(--theme-surface-2, hsl(0, 0%, 95%));
  }

  .suggestions-action__icon {
    display: flex;
    color: var(--theme-blue-text, #1a73e8);
  }

  .suggestions-action--link {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--color-brand, var(--theme-accent-text, #8d1437));
  }

  @media (min-width: 48.0625rem) {
    .suggestions-container {
      gap: 0;
      padding: 16px 20px;
      border-top: none;
      max-height: min(60vh, 28rem);
    }

    .suggestions-action {
      padding-inline: 0.5rem;
      font-size: 0.875rem;
    }
  }

  .suggestions-status {
    margin: 0;
    padding: 0.5rem 0.75rem;
    font-size: 0.8125rem;
    color: var(--theme-text-2, hsl(0, 0%, 45%));
  }

  .suggestions-status--inline {
    padding-block: 0.25rem;
  }

  .suggestions-empty {
    padding: 0.75rem 0.25rem 0.5rem;
  }

  .suggestions-empty__title {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--theme-text, #18181b);
    overflow-wrap: anywhere;
  }

  .suggestions-empty__hint {
    margin: 0.25rem 0 0;
    font-size: 0.8125rem;
    color: var(--theme-text-2, #52525b);
  }
</style>
