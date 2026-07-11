<script lang="ts">
  import LoadingIndicator from "@ui/LoadingIndicator.svelte";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
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
  import { queryStore } from "@lib/store.svelte";

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
      value === "services"
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
    {#if loaded && visibleCount > 0}
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
      <div class="campus-browse-empty" role="status">
        <svg
          class="campus-browse-empty__art"
          viewBox="0 0 180 128"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M24 98c11-24 28-35 51-35 29 0 41 20 65 14 8-2 14-7 19-13"
            stroke="currentColor"
            stroke-width="4"
            stroke-linecap="round"
            stroke-dasharray="2 9"
          />
          <path
            d="M44 29h33l8 18H36l8-18Z"
            fill="currentColor"
            opacity=".14"
          />
          <path
            d="M53 31v16M68 31v16"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
          />
          <path
            d="M116 34c0-12 20-12 20 0 0 9-10 16-10 16s-10-7-10-16Z"
            fill="currentColor"
            opacity=".2"
          />
          <circle cx="126" cy="34" r="3" fill="currentColor" />
          <path
            d="M94 80c7-12 27-10 31 4 4 14-14 24-23 14-5-6-4-14 2-19"
            stroke="currentColor"
            stroke-width="4"
            stroke-linecap="round"
          />
          <circle cx="106" cy="93" r="5" fill="currentColor" />
          <path
            d="M37 76c0-8 11-14 16-5 5-9 16-3 16 5 0 9-16 18-16 18S37 85 37 76Z"
            fill="currentColor"
            opacity=".22"
          />
        </svg>
        <h3>{emptyState.title}</h3>
        <p>{emptyState.description}</p>
      </div>
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

  .campus-browse-empty {
    display: grid;
    place-items: center;
    align-content: center;
    min-height: 100%;
    padding: 1.5rem 1rem 2rem;
    color: #8d393b;
    text-align: center;
  }

  .campus-browse-empty__art {
    width: min(10.5rem, 55vw);
    margin-bottom: 0.875rem;
  }

  .campus-browse-empty h3 {
    margin: 0;
    color: #3f3f46;
    font-size: 0.9375rem;
    line-height: 1.3;
  }

  .campus-browse-empty p {
    max-width: 19rem;
    margin: 0.375rem 0 0;
    color: #71717a;
    font-size: 0.8125rem;
    font-weight: 500;
    line-height: 1.45;
  }


</style>
