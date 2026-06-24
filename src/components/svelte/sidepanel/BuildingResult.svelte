<script lang="ts">
  import {
    queryStore,
    locationStore,
    building3DStore,
    adminAuthStore,
    mapEditStore,
  } from "../../../lib/store.svelte";
  import { getAppData } from "../../../lib/context";
  import CornerRightUp from "@lucide/svelte/icons/corner-right-up";
  import Box from "@lucide/svelte/icons/box";
  import type { BuildingData, RoomData } from "../../../lib/types";
  import ResultDisplay from "./ResultDisplay.svelte";
  import InlineEditField from "./InlineEditField.svelte";
  import { onMount } from "svelte";
  import { getBuildingRooms } from "../../../lib/local/data/utils";
  import {
    checkLocalBuildingRoom,
    syncBuildingRooms,
  } from "../../../lib/local/data/sync";
  import {
    ClientEditConflictError,
    patchAdminField,
  } from "../../../lib/admin/editor-client";

  const appData = getAppData();
  const { buildings, loaded } = $derived(appData());

  const building = $derived(
    loaded
      ? buildings.find((b) => b.buildingName === queryStore.queryValue)
      : null,
  );
  const editorEnabled = $derived(
    adminAuthStore.isAdmin && mapEditStore.enabled,
  );
  let buildingRooms = $state<RoomData[] | null>(null);
  const buildingTypeOptions = [
    { label: "Admin", value: "admin" },
    { label: "Non-admin", value: "non-admin" },
  ];
  const buildingFieldLabels = {
    buildingName: "name",
    buildingType: "type",
    directions: "directions",
  } satisfies Record<BuildingEditableField, string>;
  type BuildingEditableField = "buildingName" | "buildingType" | "directions";

  onMount(async () => {
    if (!building) return;
    const buildingChecker = await checkLocalBuildingRoom(building.id);
    buildingRooms = await getBuildingRooms(buildingChecker, building.id);
    await syncBuildingRooms(buildingChecker, building.id, buildingRooms);
  });

  function applyUpdatedBuilding(updated: BuildingData) {
    const current = buildings.find((b) => b.id === updated.id);
    if (current) Object.assign(current, updated);

    if (
      queryStore.category === "building" &&
      queryStore.type === "result" &&
      queryStore.queryValue !== updated.buildingName
    ) {
      queryStore.hydrateQuery({
        category: "building",
        type: "result",
        value: updated.buildingName,
      });
    }
  }

  function saveFailureMessage(
    entityName: string,
    fieldLabel: string,
    error: unknown,
  ) {
    const reason =
      error instanceof Error ? error.message : "Unknown save failure";
    return `${entityName} ${fieldLabel} failed to save: ${reason}`;
  }

  async function saveBuildingField(
    field: BuildingEditableField,
    value: unknown,
  ) {
    if (!building) throw new Error("Building field failed to save.");
    const entityName = building.buildingName;
    const fieldLabel = buildingFieldLabels[field];

    try {
      const updated = await patchAdminField<BuildingData>(
        "building",
        building.id,
        field,
        value,
        building.version,
      );
      applyUpdatedBuilding(updated);
    } catch (error) {
      if (error instanceof ClientEditConflictError) {
        if (error.latest) applyUpdatedBuilding(error.latest as BuildingData);
        throw new Error(
          `${entityName} ${fieldLabel} conflict. Showing latest server data; review before saving again.`,
        );
      }

      throw new Error(saveFailureMessage(entityName, fieldLabel, error));
    }
  }
</script>

<div class="building-query-wrapper">
  {#if building}
    <div class="building-header">
      <h2 class="building-title">{building.buildingName}</h2>
      {#if building.directions}
        <p class="building-desc">{building.directions}</p>
      {/if}
      {#if building.lon && building.lat}
        <div class="building-actions">
          <button
            class="get-directions-btn"
            onclick={() => {
              locationStore.requestLocation();
              locationStore.setDestination([
                building.lon ?? 0,
                building.lat ?? 0,
              ]);
            }}
          >
            Get Directions
            <CornerRightUp size={18} />
          </button>
          <button
            class="view-3d-btn"
            onclick={() => building3DStore.open(building.buildingName)}
          >
            View in 3D
            <Box size={18} />
          </button>
        </div>
      {/if}
      {#if editorEnabled}
        <div class="editor-card">
          <div class="editor-heading">
            <span>Building editor</span>
            <small>Version {building.version}</small>
          </div>
          <InlineEditField
            label="Name"
            value={building.buildingName}
            onSave={(value) => saveBuildingField("buildingName", value)}
          />
          <InlineEditField
            label="Type"
            value={building.buildingType}
            inputType="select"
            options={buildingTypeOptions}
            onSave={(value) => saveBuildingField("buildingType", value)}
          />
          <InlineEditField
            label="Directions"
            value={building.directions}
            inputType="textarea"
            rows={4}
            onSave={(value) => saveBuildingField("directions", value)}
          />
        </div>
      {/if}
    </div>
  {:else}
    <p>Loading data...</p>
  {/if}
  {#if buildingRooms}
    <ResultDisplay filteredRooms={buildingRooms} />
  {:else}
    Loading data...
  {/if}
</div>

<style>
  .building-query-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0.75rem; /* 12px gap from design */
    width: 100%;
    flex: 1 1 0;
    overflow-y: auto;
  }

  .building-header {
    display: flex;
    flex-direction: column;
    gap: 0.25rem; /* 4px gap */
    width: 100%;
    flex-shrink: 0;
  }

  .building-title {
    font-size: 1.125rem; /* 18px */
    font-weight: bold;
    color: black;
    margin: 0;
    line-height: 1.25rem; /* 20px */
  }

  .building-desc {
    font-size: 0.75rem; /* 12px */
    color: #4f4f4f;
    margin: 0;
    line-height: 1.5;
  }

  .building-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }

  .editor-card {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.35rem;
    padding: 0.5rem;
    border: 1px solid hsl(160, 42%, 82%);
    border-radius: 0.75rem;
    background: hsla(160, 42%, 96%, 0.88);
  }

  .editor-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    color: hsl(160, 84%, 18%);
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .editor-heading small {
    color: #666;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: none;
    letter-spacing: 0;
    white-space: nowrap;
  }

  .get-directions-btn,
  .view-3d-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
    width: max-content;
  }

  .get-directions-btn {
    background-color: #7b1113;
    color: white;
  }

  .get-directions-btn:hover {
    background-color: #9a1517;
  }

  .view-3d-btn {
    background-color: white;
    color: #7b1113;
    border: 1px solid #d8b9ba;
  }

  .view-3d-btn:hover {
    background-color: #fdf3f3;
  }
</style>
