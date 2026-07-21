<script lang="ts">
  import LoadingIndicator from "@ui/LoadingIndicator.svelte";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import EntityEmptyState from "./EntityEmptyState.svelte";
  import EntityPanelFilter from "./EntityPanelFilter.svelte";
  import EntityPanelHeader from "./EntityPanelHeader.svelte";
  import { getAppData } from "@lib/context";
  import type { CampusBrowseTab } from "@lib/browse-campus";
  import {
    isStudentOrganization,
    orgCategoryLabel,
  } from "@constants/org-categories";
  import {
    isLandmarkPlaceCategory,
    placeDirectoryLabel,
  } from "@constants/place-categories";
  import { jeepneyStore, queryStore, transitStore } from "@lib/store.svelte";

  const appData = getAppData();
  const { buildings, colleges, divisions, dorms, organizations, places, loaded } =
    $derived(appData());

  let filterText = $state("");

  const activeTab = $derived.by((): CampusBrowseTab => {
    const value = queryStore.queryValue;
    if (
      value === "colleges" ||
      value === "divisions" ||
      value === "dorms" ||
      value === "organizations" ||
      value === "offices" ||
      value === "landmarks" ||
      value === "services" ||
      value === "jeepney"
    ) {
      return value;
    }
    return "buildings";
  });

  const tabTitle = $derived.by(() => {
    switch (activeTab) {
      case "colleges":
        return "Colleges";
      case "dorms":
        return "Dorms";
      case "divisions":
        return "Divisions";
      case "organizations":
        return "Student Organizations";
      case "offices":
        return "Offices & Academic Units";
      case "landmarks":
        return "Landmarks";
      case "services":
        return "Services & Establishments";
      case "jeepney":
        return "Jeepney Routes";
      default:
        return "Buildings";
    }
  });

  const tabMeta = $derived.by(() => {
    switch (activeTab) {
      case "colleges":
        return {
          noun: "college",
          plural: "colleges",
          placeholder: "Search colleges…",
        };
      case "dorms":
        return {
          noun: "dorm",
          plural: "dorms",
          placeholder: "Search dorms…",
        };
      case "divisions":
        return {
          noun: "division",
          plural: "divisions",
          placeholder: "Search divisions…",
        };
      case "organizations":
        return {
          noun: "student organization",
          plural: "student organizations",
          placeholder: "Search student organizations…",
        };
      case "offices":
        return {
          noun: "office or academic unit",
          plural: "offices & academic units",
          placeholder: "Search offices & academic units…",
        };
      case "landmarks":
        return {
          noun: "landmark",
          plural: "landmarks",
          placeholder: "Search landmarks…",
        };
      case "services":
        return {
          noun: "service or establishment",
          plural: "services & establishments",
          placeholder: "Search services & establishments…",
        };
      case "jeepney":
        return {
          noun: "jeepney route",
          plural: "jeepney routes",
          placeholder: "Search jeepney routes…",
        };
      default:
        return {
          noun: "building",
          plural: "buildings",
          placeholder: "Search buildings…",
        };
    }
  });

  const filteredBuildings = $derived.by(() => {
    if (!loaded || !buildings) return [];
    const needle = filterText.trim().toLowerCase();
    const rows = [...buildings].sort((a, b) =>
      a.buildingName.localeCompare(b.buildingName),
    );
    if (!needle) return rows;
    return rows.filter((row) =>
      row.buildingName.toLowerCase().includes(needle),
    );
  });

  const filteredColleges = $derived.by(() => {
    if (!loaded || !colleges) return [];
    const needle = filterText.trim().toLowerCase();
    const rows = [...colleges].sort((a, b) =>
      a.collegeName.localeCompare(b.collegeName),
    );
    if (!needle) return rows;
    return rows.filter((row) => row.collegeName.toLowerCase().includes(needle));
  });

  const filteredDivisions = $derived.by(() => {
    if (!loaded || !divisions) return [];
    const needle = filterText.trim().toLowerCase();
    const rows = [...divisions].sort((a, b) =>
      a.divisionName.localeCompare(b.divisionName),
    );
    if (!needle) return rows;
    return rows.filter((row) =>
      row.divisionName.toLowerCase().includes(needle),
    );
  });

  const filteredOrganizations = $derived.by(() => {
    if (!loaded || !organizations) return [];
    if (activeTab !== "organizations" && activeTab !== "offices") return [];
    const needle = filterText.trim().toLowerCase();
    const rows = organizations.filter((row) => {
      return activeTab === "organizations"
        ? isStudentOrganization(row.category)
        : !isStudentOrganization(row.category);
    }).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    if (!needle) return rows;
    return rows.filter((row) => row.name.toLowerCase().includes(needle));
  });

  const filteredDorms = $derived.by(() => {
    if (!loaded || !dorms || activeTab !== "dorms") return [];
    const needle = filterText.trim().toLowerCase();
    const rows = [...dorms].sort((a, b) => a.dormName.localeCompare(b.dormName));
    return needle
      ? rows.filter((row) => row.dormName.toLowerCase().includes(needle))
      : rows;
  });

  const filteredPlaces = $derived.by(() => {
    if (!loaded || !places || (activeTab !== "landmarks" && activeTab !== "services")) {
      return [];
    }
    const needle = filterText.trim().toLowerCase();
    const rows = places
      .filter((row) => {
        const landmark = isLandmarkPlaceCategory(row.category);
        return activeTab === "landmarks" ? landmark : !landmark;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    return needle
      ? rows.filter((row) => row.name.toLowerCase().includes(needle))
      : rows;
  });

  const visibleItems = $derived.by(() => {
    if (activeTab === "colleges") {
      return filteredColleges.map((row) => ({
        id: row.id,
        label: row.collegeName,
        meta: null as string | null,
        open: () => openCollege(row.collegeName),
      }));
    }
    if (activeTab === "dorms") {
      return filteredDorms.map((row) => ({
        id: row.id,
        label: row.dormName,
        meta: row.isUpManaged ? "UP-managed dorm" : "Private dorm",
        open: () => openDorm(row.dormName),
      }));
    }
    if (activeTab === "divisions") {
      return filteredDivisions.map((row) => ({
        id: row.id,
        label: row.divisionName,
        meta: null as string | null,
        open: () => openDivision(row.divisionName),
      }));
    }
    if (activeTab === "organizations" || activeTab === "offices") {
      return filteredOrganizations.map((row) => ({
        id: row.id,
        label: row.name,
        meta: orgCategoryLabel(row.category),
        open: () => openOrg(row.name),
      }));
    }
    if (activeTab === "landmarks" || activeTab === "services") {
      return filteredPlaces.map((row) => ({
        id: row.id,
        label: row.name,
        meta: placeDirectoryLabel(row.category),
        open: () => openPlace(row.name),
      }));
    }
    if (activeTab === "jeepney") {
      return filteredJeepneyRoutes.map((route) => ({
        id: route.id,
        label: route.name,
        meta: `${route.stops.length} stops`,
        open: () => openJeepneyRoute(route.id),
      }));
    }
    return filteredBuildings.map((row) => ({
      id: row.id,
      label: row.buildingName,
      meta: null as string | null,
      open: () => openBuilding(row.buildingName),
    }));
  });

  const visibleCount = $derived(visibleItems.length);

  const emptyState = $derived.by(() => {
    const query = filterText.trim();
    if (query) {
      return {
        title: "Nothing in this corner of campus",
        description: `No ${tabMeta.plural} match “${query}”. Try a shorter name or another keyword.`,
      };
    }
    return {
      title: "This corner is still being mapped",
      description: `No ${tabMeta.plural} are listed yet. Check another directory while we fill this one in.`,
    };
  });

  const statusLine = $derived.by(() => {
    if (!loaded) return "Loading campus directory…";
    if (visibleCount === 0) {
      const query = filterText.trim();
      return query
        ? `No ${tabMeta.plural} match “${query}”.`
        : `No ${tabMeta.plural} listed.`;
    }
    const unit = visibleCount === 1 ? tabMeta.noun : tabMeta.plural;
    return `${visibleCount} ${unit}`;
  });

  function openBuilding(name: string) {
    queryStore.updateQuery({
      category: "building",
      type: "result",
      value: name,
    });
    queryStore.inputValue = name;
  }

  function openCollege(name: string) {
    queryStore.updateQuery({
      category: "college",
      type: "result",
      value: name,
    });
    queryStore.inputValue = name;
  }

  function openDivision(name: string) {
    queryStore.updateQuery({
      category: "division",
      type: "result",
      value: name,
    });
    queryStore.inputValue = name;
  }

  function openOrg(name: string) {
    queryStore.updateQuery({
      category: "organization",
      type: "result",
      value: name,
    });
    queryStore.inputValue = name;
  }

  function openDorm(name: string) {
    queryStore.updateQuery({
      category: "dorm",
      type: "result",
      value: name,
    });
    queryStore.inputValue = name;
  }

  function openPlace(name: string) {
    queryStore.updateQuery({
      category: "place",
      type: "result",
      value: name,
    });
    queryStore.inputValue = name;
  }

  const filteredJeepneyRoutes = $derived.by(() => {
    if (activeTab !== "jeepney") return [];
    const needle = filterText.trim().toLowerCase();
    if (!needle) return transitStore.routes;
    return transitStore.routes.filter(
      (route) =>
        route.name.toLowerCase().includes(needle) ||
        route.description.toLowerCase().includes(needle) ||
        route.stops.some((stop) => stop.name.toLowerCase().includes(needle)),
    );
  });

  function openJeepneyRoute(id: string) {
    jeepneyStore.openRouteOnMap(id);
  }

  function closeList() {
    queryStore.clearQuery();
  }

  function onFilterInput(event: Event) {
    filterText = (event.currentTarget as HTMLInputElement).value;
  }
</script>

<div class="campus-browse-panel">
  <EntityPanelHeader
    closeAriaLabel="Close browse list"
    closeTitle="Close"
    onclose={closeList}
  >
    {#snippet trailing()}
      <h2 class="entity-header__title">{tabTitle}</h2>
      <EntityPanelFilter
        value={filterText}
        label={`Filter ${tabMeta.plural}`}
        placeholder={tabMeta.placeholder}
        search
        oninput={onFilterInput}
      />
      {#if !loaded}
        <p class="entity-panel-status">
          <LoadingIndicator label="Loading campus directory…" />
        </p>
      {:else if visibleCount > 0}
        <p class="entity-panel-status" aria-live="polite">{statusLine}</p>
      {/if}
    {/snippet}
  </EntityPanelHeader>

  <div
    class="entity-panel-body campus-browse-body map-chrome-scroll"
    role="region"
    aria-label={`${tabMeta.plural} list`}
  >
    {#if activeTab === "jeepney" && filteredJeepneyRoutes.length > 0}
      <ul class="entity-nav-list">
        {#each filteredJeepneyRoutes as route (route.id)}
          <li>
            <button
              type="button"
              class="entity-list-row"
              class:jeepney-route-item--active={jeepneyStore.selectedRouteId === route.id}
              title={`Open ${route.name} route details`}
              onclick={() => openJeepneyRoute(route.id)}
            >
              <span
                class="jeepney-route-item__dot"
                style:background-color={route.color}
                aria-hidden="true"
              ></span>
              <span class="entity-list-row__label">{route.name}</span>
              <span class="entity-list-row__meta"
                >{route.stops.length} stops</span
              >
            </button>
          </li>
        {/each}
      </ul>
    {:else if activeTab !== "jeepney" && loaded && visibleCount > 0}
      <ul class="entity-nav-list">
        {#each visibleItems as item (item.id)}
          <li>
            <button
              type="button"
              class="entity-list-row"
              title={item.label}
              onclick={item.open}
            >
              <span class="entity-list-row__label">{item.label}</span>
              {#if item.meta}
                <span class="entity-list-row__meta">{item.meta}</span>
              {/if}
              <ChevronRight
                size={16}
                aria-hidden="true"
                class="entity-list-row__chevron"
              />
            </button>
          </li>
        {/each}
      </ul>
    {:else if loaded}
      <EntityEmptyState
        title={emptyState.title}
        description={emptyState.description}
      >
        {#snippet icon()}
          <svg viewBox="0 0 180 128" fill="none" aria-hidden="true">
            <!-- Folded campus map with a dotted route and a location pin. -->
            <rect
              x="28"
              y="34"
              width="124"
              height="70"
              rx="10"
              fill="currentColor"
              opacity=".1"
            />
            <rect
              x="28"
              y="34"
              width="124"
              height="70"
              rx="10"
              stroke="currentColor"
              stroke-width="3"
            />
            <path
              d="M69 36v66M111 36v66"
              stroke="currentColor"
              stroke-width="2"
              opacity=".25"
            />
            <path
              d="M42 90c12-8 20-24 34-20s22 18 44-2"
              stroke="currentColor"
              stroke-width="3.5"
              stroke-linecap="round"
              stroke-dasharray="1 8"
            />
            <circle cx="42" cy="90" r="4" fill="currentColor" />
            <path
              d="M124 22c-8.8 0-16 7-16 15.6 0 10.8 16 26.4 16 26.4s16-15.6 16-26.4C140 29 132.8 22 124 22Z"
              fill="currentColor"
              opacity=".85"
            />
            <circle cx="124" cy="38" r="5.5" fill="white" />
          </svg>
        {/snippet}
      </EntityEmptyState>
    {/if}
  </div>
</div>

<style>
  @import "./entity-detail.css";

  .campus-browse-panel {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    height: 100%;
    min-height: 0;
    font-family: inherit;
  }

  .entity-list-row__meta {
    flex-shrink: 0;
    margin-left: auto;
    padding: 0.0625rem 0.4375rem;
    border-radius: 999px;
    background: hsl(5, 30%, 94%);
    color: hsl(5, 40%, 34%);
    font-size: 0.6875rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .jeepney-route-item--active {
    background: hsl(5, 53%, 96%);
  }

  .jeepney-route-item__dot {
    flex-shrink: 0;
    width: 0.625rem;
    height: 0.625rem;
    border-radius: 999px;
    box-shadow: 0 0 0 1px hsla(0, 0%, 100%, 0.85);
  }


</style>
