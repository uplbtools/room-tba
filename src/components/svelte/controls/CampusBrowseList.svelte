<script lang="ts">
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import EntityPanelFilter from "./EntityPanelFilter.svelte";
  import EntityPanelHeader from "./EntityPanelHeader.svelte";
  import { getAppData } from "@lib/context";
  import type { CampusBrowseTab } from "@lib/browse-campus";
  import { queryStore } from "@lib/store.svelte";

  const appData = getAppData();
  const { buildings, colleges, divisions, loaded } = $derived(appData());

  let filterText = $state("");

  const activeTab = $derived.by((): CampusBrowseTab => {
    const value = queryStore.queryValue;
    if (value === "colleges" || value === "divisions") return value;
    return "buildings";
  });

  const tabTitle = $derived.by(() => {
    switch (activeTab) {
      case "colleges":
        return "Colleges";
      case "divisions":
        return "Divisions";
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
      case "divisions":
        return {
          noun: "division",
          plural: "divisions",
          placeholder: "Search divisions…",
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

  const visibleItems = $derived.by(() => {
    if (activeTab === "colleges") {
      return filteredColleges.map((row) => ({
        id: row.id,
        label: row.collegeName,
        open: () => openCollege(row.collegeName),
      }));
    }
    if (activeTab === "divisions") {
      return filteredDivisions.map((row) => ({
        id: row.id,
        label: row.divisionName,
        open: () => openDivision(row.divisionName),
      }));
    }
    return filteredBuildings.map((row) => ({
      id: row.id,
      label: row.buildingName,
      open: () => openBuilding(row.buildingName),
    }));
  });

  const visibleCount = $derived(visibleItems.length);

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
      <p class="entity-panel-status" aria-live="polite">{statusLine}</p>
    {/snippet}
  </EntityPanelHeader>

  <div
    class="entity-panel-body campus-browse-body"
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
              <ChevronRight
                size={16}
                aria-hidden="true"
                class="entity-list-row__chevron"
              />
            </button>
          </li>
        {/each}
      </ul>
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

  .campus-browse-body {
    scrollbar-width: thin;
    scrollbar-color: #d4d4d8 transparent;
  }
</style>
