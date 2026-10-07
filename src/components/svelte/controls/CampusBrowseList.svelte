<script lang="ts">
  import EntitySkeleton from "@ui/EntitySkeleton.svelte";
  import LoadingIndicator from "@ui/LoadingIndicator.svelte";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import EntityEmptyState from "./EntityEmptyState.svelte";
  import EntityPanelHeader from "./EntityPanelHeader.svelte";
  import { getAppData } from "@lib/context";
  import type { CampusBrowseTab } from "@lib/browse-campus";
  import {
    isStudentOrganization,
    normalizeOrgCategory,
    orgCategoryLabel,
    type OrgCategory,
  } from "@constants/org-categories";
  import { collegeLabel, displayOrgName } from "@lib/directory-labels";
  import {
    isLandmarkPlaceCategory,
    placeDirectoryLabel,
  } from "@constants/place-categories";
  import {
    jeepneyStore,
    queryStore,
    sidePanelStore,
    transitStore,
  } from "@lib/store.svelte";
  import CollegeResult from "./CollegeResult.svelte";
  import BuildingResult from "./BuildingResult.svelte";
  import DivisionResult from "./DivisionResult.svelte";
  import OrgResult from "./OrgResult.svelte";
  import DormResult from "./DormResult.svelte";
  import PlaceResult from "./PlaceResult.svelte";
  import { campusTransit } from "../../../campus.config";
  import { JEEPNEY_ROUTES } from "@constants/jeepney-routes";
  import {
    distinctStopCount,
    transitRouteKind,
    type TransitRouteKind,
  } from "@lib/transit-route-kind";

  // Derived from campusTransit.label so a fork edits one place:
  // label Jeepney routes → title Jeepney Routes, plural jeepney routes,
  // noun jeepney route.
  const transitPlural = campusTransit.label.toLowerCase();
  const transitTitle = campusTransit.label.replace(/(^|\s)\p{L}/gu, (c) =>
    c.toUpperCase(),
  );
  // ponytail: trailing-s trim; give the label a regular plural or adjust here.
  const transitNoun = transitPlural.replace(/s$/, "");

  const appData = getAppData();
  const { buildings, colleges, divisions, dorms, organizations, places, loaded } =
    $derived(appData());

  let orgCategory = $state<OrgCategory | "all">("all");

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
        return "Food & stores";
      case "jeepney":
        return transitStore.routes.some((r) => transitRouteKind(r) === "bus")
          ? "Jeepney & Bus Routes"
          : transitTitle;
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
        };
      case "dorms":
        return {
          noun: "dorm",
          plural: "dorms",
        };
      case "divisions":
        return {
          noun: "division",
          plural: "divisions",
        };
      case "organizations":
        return {
          noun: "student organization",
          plural: "student organizations",
        };
      case "offices":
        return {
          noun: "office or academic unit",
          plural: "offices & academic units",
        };
      case "landmarks":
        return {
          noun: "landmark",
          plural: "landmarks",
        };
      case "services":
        return {
          noun: "service or establishment",
          plural: "services & establishments",
        };
      case "jeepney":
        // "route", not "jeepney route": the list holds buses too.
        return {
          noun: transitNoun.replace(/^jeepney /, ""),
          plural: transitPlural.replace(/^jeepney /, ""),
        };
      default:
        return {
          noun: "building",
          plural: "buildings",
        };
    }
  });

  // No filter box in the sheet: the list is the result for the chip named
  // in the search bar, and typing there searches the whole campus.
  const filteredBuildings = $derived.by(() => {
    if (!loaded || !buildings) return [];
    return [...buildings].sort((a, b) =>
      a.buildingName.localeCompare(b.buildingName),
    );
  });

  const filteredColleges = $derived.by(() => {
    if (!loaded || !colleges) return [];
    return [...colleges].sort((a, b) =>
      a.collegeName.localeCompare(b.collegeName),
    );
  });

  const filteredDivisions = $derived.by(() => {
    if (!loaded || !divisions) return [];
    return [...divisions].sort((a, b) =>
      a.divisionName.localeCompare(b.divisionName),
    );
  });

  const tabOrganizations = $derived.by(() => {
    if (!loaded || !organizations) return [];
    if (activeTab !== "organizations" && activeTab !== "offices") return [];
    return organizations
      .filter((row) =>
        activeTab === "organizations"
          ? isStudentOrganization(row.category)
          : !isStudentOrganization(row.category),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  // Filter chips only when the list really mixes kinds (orgs, councils,
  // publications); one chip per kind present, with its count.
  const orgCategoryChips = $derived.by(() => {
    if (activeTab !== "organizations") return [];
    const counts = new Map<OrgCategory, number>();
    for (const row of tabOrganizations) {
      const category = normalizeOrgCategory(row.category);
      if (category) counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    if (counts.size < 2) return [];
    return [...counts].map(([category, count]) => ({
      category,
      count,
      label: orgCategoryLabel(category) ?? category,
    }));
  });

  $effect(() => {
    void activeTab;
    orgCategory = "all";
  });

  const filteredOrganizations = $derived.by(() => {
    return tabOrganizations.filter(
      (row) =>
        orgCategory === "all" ||
        normalizeOrgCategory(row.category) === orgCategory,
    );
  });

  // Same rule the map uses to place an org: its own pin or its building's.
  const locatedOrgCount = $derived.by(() => {
    if (activeTab !== "organizations") return 0;
    const pinned = new Set(
      (buildings ?? [])
        .filter((b) => b.lat !== null && b.lon !== null)
        .map((b) => b.id),
    );
    return filteredOrganizations.filter(
      (org) =>
        (org.lat !== null && org.lon !== null) ||
        (org.buildingId !== null && pinned.has(org.buildingId)),
    ).length;
  });

  const filteredDorms = $derived.by(() => {
    if (!loaded || !dorms || activeTab !== "dorms") return [];
    return [...dorms].sort((a, b) => a.dormName.localeCompare(b.dormName));
  });

  const filteredPlaces = $derived.by(() => {
    if (!loaded || !places || (activeTab !== "landmarks" && activeTab !== "services")) {
      return [];
    }
    return places
      .filter((row) => {
        const landmark = isLandmarkPlaceCategory(row.category);
        return activeTab === "landmarks" ? landmark : !landmark;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  const visibleItems = $derived.by(() => {
    if (activeTab === "colleges") {
      return filteredColleges.map((row) => {
        const { name, acronym } = collegeLabel(
          row.collegeName,
          row.websiteLink,
        );
        return {
          id: row.id,
          label: name,
          meta: acronym,
          open: () => openCollege(row.collegeName),
        };
      });
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
        label: activeTab === "organizations" ? displayOrgName(row.name) : row.name,
        // Every row in the student list is a student org; only say so when it
        // is a different kind (council, publication).
        meta:
          activeTab === "organizations" &&
          normalizeOrgCategory(row.category) === "student-org"
            ? null
            : orgCategoryLabel(row.category),
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
        meta: `${distinctStopCount(route)} stops`,
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

  const emptyState = $derived({
    title: "This corner is still being mapped",
    description: `No ${tabMeta.plural} are listed yet. Check another directory while we fill this one in.`,
  });

  const statusLine = $derived.by(() => {
    if (!loaded) return "Loading campus directory…";
    if (visibleCount === 0) return `No ${tabMeta.plural} listed.`;
    const unit = visibleCount === 1 ? tabMeta.noun : tabMeta.plural;
    if (activeTab === "organizations") {
      return `${visibleCount} ${unit} · ${locatedOrgCount} on the map`;
    }
    return `${visibleCount} ${unit}`;
  });

  function openBuilding(name: string) {
    queryStore.updateQuery({
      category: "building",
      type: "result",
      value: name,
    });
    queryStore.inputValue = name;
    sidePanelStore.openPanel({
      type: "search-result",
      component: BuildingResult,
    });
  }

  function openCollege(name: string) {
    queryStore.updateQuery({
      category: "college",
      type: "result",
      value: name,
    });
    queryStore.inputValue = name;
    sidePanelStore.openPanel({
      type: "search-result",
      component: CollegeResult,
    });
  }

  function openDivision(name: string) {
    queryStore.updateQuery({
      category: "division",
      type: "result",
      value: name,
    });
    queryStore.inputValue = name;
    sidePanelStore.openPanel({
      type: "search-result",
      component: DivisionResult,
    });
  }

  function openOrg(name: string) {
    queryStore.updateQuery({
      category: "organization",
      type: "result",
      value: name,
    });
    queryStore.inputValue = name;
    sidePanelStore.openPanel({
      type: "search-result",
      component: OrgResult,
    });
  }

  function openDorm(name: string) {
    queryStore.updateQuery({
      category: "dorm",
      type: "result",
      value: name,
    });
    queryStore.inputValue = name;
    sidePanelStore.openPanel({
      type: "search-result",
      component: DormResult,
    });
  }

  function openPlace(name: string) {
    queryStore.updateQuery({
      category: "place",
      type: "result",
      value: name,
    });
    queryStore.inputValue = name;
    sidePanelStore.openPanel({
      type: "search-result",
      component: PlaceResult,
    });
  }

  // Campus jeeps first (in their bundled order, Kaliwa/Kanan leading), then
  // town jeeps, then buses. Sorted by id, a Manila bus led the list and the
  // busiest campus loop sat third.
  const KIND_ORDER: TransitRouteKind[] = ["campus", "town", "bus"];
  const KIND_HEADING: Record<TransitRouteKind, string> = {
    campus: "Campus jeepneys",
    town: "Town jeepneys",
    bus: "Buses",
  };
  const campusOrder = new Map(JEEPNEY_ROUTES.map((r, i) => [r.id, i]));

  const filteredJeepneyRoutes = $derived.by(() => {
    if (activeTab !== "jeepney") return [];
    return [...transitStore.routes].sort(
      (a, b) =>
        KIND_ORDER.indexOf(transitRouteKind(a)) -
          KIND_ORDER.indexOf(transitRouteKind(b)) ||
        (campusOrder.get(a.id) ?? 99) - (campusOrder.get(b.id) ?? 99) ||
        a.name.localeCompare(b.name),
    );
  });

  const jeepneyRouteGroups = $derived(
    KIND_ORDER.map((kind) => ({
      kind,
      heading: KIND_HEADING[kind],
      routes: filteredJeepneyRoutes.filter((r) => transitRouteKind(r) === kind),
    })).filter((group) => group.routes.length > 0),
  );

  function openJeepneyRoute(id: string) {
    jeepneyStore.openRouteOnMap(id);
  }

</script>

<div class="campus-browse-panel">
  <!-- One close control: the search bar's X, which names this list. -->
  <EntityPanelHeader>
    {#snippet trailing()}
      <h2 class="entity-header__title">{tabTitle}</h2>
      {#if orgCategoryChips.length > 0}
        <div
          class="campus-browse-chips"
          role="group"
          aria-label="Filter by kind"
        >
          <button
            type="button"
            class="map-chrome-chip"
            class:map-chrome-chip--filter-selected={orgCategory === "all"}
            aria-pressed={orgCategory === "all"}
            onclick={() => (orgCategory = "all")}
          >
            All
          </button>
          {#each orgCategoryChips as chip (chip.category)}
            <button
              type="button"
              class="map-chrome-chip"
              class:map-chrome-chip--filter-selected={orgCategory ===
                chip.category}
              aria-pressed={orgCategory === chip.category}
              onclick={() => (orgCategory = chip.category)}
            >
              {chip.label}
              <span class="map-chrome-chip__count">{chip.count}</span>
            </button>
          {/each}
        </div>
      {/if}
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
      {#each jeepneyRouteGroups as group (group.kind)}
      {#if jeepneyRouteGroups.length > 1}
        <h3 class="jeepney-route-group">{group.heading}</h3>
      {/if}
      <ul class="entity-nav-list">
        {#each group.routes as route (route.id)}
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
                >{distinctStopCount(route)} stops</span
              >
            </button>
          </li>
        {/each}
      </ul>
      {/each}
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
    {:else if !loaded && activeTab !== "jeepney"}
      <!-- Header LoadingIndicator already announces the load; empty label keeps
           the skeleton out of the accessibility tree. -->
      <EntitySkeleton variant="directory" label="" />
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

  /* Long college and org names wrap to a second line instead of losing
     the words that tell them apart. */
  .campus-browse-body .entity-list-row__label {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    white-space: normal;
  }

  .campus-browse-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .campus-browse-chips .map-chrome-chip {
    min-height: 2.25rem;
    height: auto;
    font-size: 0.75rem;
  }

  .jeepney-route-group {
    margin: 0.75rem 0 0.25rem;
    padding: 0 0.25rem;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: hsl(0, 0%, 40%);
  }

  .jeepney-route-group:first-child {
    margin-top: 0;
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
