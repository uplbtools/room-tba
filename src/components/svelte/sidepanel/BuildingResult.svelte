<script lang="ts">
  import {
    adminAuthStore,
    mapEditStore,
    mapProposalStore,
    queryStore,
    locationStore,
    building3DStore,
    toastStore,
  } from "../../../lib/store.svelte";
  import { getAppActions, getAppData } from "../../../lib/context";
  import CornerRightUp from "@lucide/svelte/icons/corner-right-up";
  import Box from "@lucide/svelte/icons/box";
  import type { BuildingData, RoomData } from "../../../lib/types";
  import ResultDisplay from "./ResultDisplay.svelte";
  import CopyLinkButton from "../CopyLinkButton.svelte";
  import EntityEditorToggle from "../editor/EntityEditorToggle.svelte";
  import EntityEditorPanel from "../editor/EntityEditorPanel.svelte";
  import EntityEditorField from "../editor/EntityEditorField.svelte";
  import { entityEditorSavedMessage } from "../../../lib/editor/field-action-label";
  import { onMount } from "svelte";
  import { getBuildingRooms } from "../../../lib/local/data/utils";
  import {
    checkLocalBuildingRoom,
    syncBuildingRooms,
  } from "../../../lib/local/data/sync";
  import { getBuildingShareUrl } from "../../../lib/share-links";
  import {
    getStoredProposalForEntity,
    persistEntityChange,
  } from "../../../lib/proposals/client";
  import { handlePersistEntityResult } from "../../../lib/editor/handle-persist-result";

  type BuildingEditableField = "buildingName" | "directions" | "buildingType";

  type BuildingPatchResponse = {
    success?: boolean;
    building?: BuildingData;
    latest?: BuildingData | null;
    error?: string;
  };

  const appData = getAppData();
  const appActions = getAppActions();
  const { buildings, loaded } = $derived(appData());

  const building = $derived(
    loaded
      ? buildings.find((b) => b.buildingName === queryStore.queryValue)
      : null,
  );
  const buildingShareUrl = $derived(
    building ? getBuildingShareUrl(building.buildingName) : "",
  );
  let buildingRooms = $state<RoomData[] | null>(null);

  let editing = $state(false);
  let draftBuildingId = $state<number | null>(null);
  let draftVersion = $state<number | null>(null);
  let nameDraft = $state("");
  let directionsDraft = $state("");
  let typeDraft = $state<BuildingData["buildingType"]>("non-admin");
  let savingField = $state<BuildingEditableField | null>(null);
  let savedField = $state<BuildingEditableField | null>(null);
  let fieldError = $state<string | null>(null);
  let submitterNameDraft = $state("");
  let proposalStatus = $state<string | null>(null);
  let activeProposalId = $state<number | null>(null);

  const canPublish = $derived(adminAuthStore.canPublish);

  const fieldLabels: Record<BuildingEditableField, string> = {
    buildingName: "Building name",
    directions: "Building directions",
    buildingType: "Building type",
  };

  onMount(async () => {
    if (!building) return;
    const buildingChecker = await checkLocalBuildingRoom(building.id);
    buildingRooms = await getBuildingRooms(buildingChecker, building.id);
    await syncBuildingRooms(buildingChecker, building.id, buildingRooms);
  });

  $effect(() => {
    const current = building;
    if (!current) return;
    if (draftBuildingId === current.id && draftVersion === current.version) {
      return;
    }

    draftBuildingId = current.id;
    draftVersion = current.version;
    nameDraft = current.buildingName;
    directionsDraft = current.directions ?? "";
    typeDraft = current.buildingType;
    savedField = null;
    fieldError = null;
    proposalStatus = null;
    const stored = getStoredProposalForEntity("building", current.id);
    activeProposalId = stored?.id ?? null;
    if (stored) proposalStatus = stored.status;
  });

  function fieldLabel(field: BuildingEditableField) {
    return fieldLabels[field];
  }

  function enablePinProposal() {
    const current = building;
    if (!current?.lat || !current.lon) return;
    mapProposalStore.enable(
      {
        type: "building",
        id: current.id,
        label: current.buildingName,
        version: current.version,
      },
      submitterNameDraft,
      activeProposalId,
    );
    toastStore.show(
      `Drag the ${current.buildingName} pin on the map, then release to submit.`,
      "info",
    );
  }

  function syncBuildingFromServer(updated: BuildingData) {
    appActions.replaceBuilding(updated);
    queryStore.hydrateQuery({
      type: "result",
      category: "building",
      value: updated.buildingName,
    });
  }

  async function saveField(field: BuildingEditableField) {
    const current = building;
    if (!current) return;

    const body: {
      version: number;
      buildingName?: string;
      directions?: string;
      buildingType?: BuildingData["buildingType"];
    } = { version: current.version };

    if (field === "buildingName") {
      const trimmedName = nameDraft.trim();
      if (trimmedName.length === 0) {
        fieldError = `${current.buildingName} name cannot be empty.`;
        return;
      }
      body.buildingName = trimmedName;
    } else if (field === "directions") {
      body.directions = directionsDraft.trim();
    } else if (field === "buildingType") {
      body.buildingType = typeDraft;
    }

    savingField = field;
    savedField = null;
    fieldError = null;

    try {
      const result = await persistEntityChange({
        entityType: "building",
        entityId: current.id,
        baseVersion: current.version,
        patch: body,
        entityLabel: current.buildingName,
        canPublish,
        submitterName:
          adminAuthStore.displayName ??
          adminAuthStore.username ??
          submitterNameDraft,
        proposalId: activeProposalId,
      });

      const outcome = handlePersistEntityResult<BuildingData>(result, {
        syncFromServer: syncBuildingFromServer,
        fallbackError: `${current.buildingName} ${fieldLabel(field)} could not be saved.`,
      });

      if (outcome.error) {
        fieldError = outcome.error;
        return;
      }

      if (outcome.published) {
        savedField = field;
        setTimeout(() => {
          if (savedField === field) savedField = null;
        }, 1800);
        return;
      }

      if (outcome.proposal) {
        activeProposalId = outcome.proposal.id;
        proposalStatus = outcome.proposal.status;
        savedField = field;
        toastStore.show(
          `Suggestion for ${current.buildingName} submitted for review.`,
          "success",
        );
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Network error";
      fieldError = `${current.buildingName} ${fieldLabel(field)} failed to save: ${reason}`;
    } finally {
      savingField = null;
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
      <div class="building-actions">
        {#if building.lon && building.lat}
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
        {/if}
        <CopyLinkButton
          url={buildingShareUrl}
          ariaLabel={`Copy link to ${building.buildingName}`}
          successMessage={`Copied link for ${building.buildingName}.`}
          errorMessage={`Could not copy link for ${building.buildingName}.`}
          feedback="none"
          variant="chip"
          onsuccess={() =>
            toastStore.show(
              `Copied link for ${building.buildingName}.`,
              "success",
            )}
          onerror={() =>
            toastStore.show(
              `Could not copy link for ${building.buildingName}.`,
              "error",
            )}
        />
        <EntityEditorToggle
          expanded={editing}
          {canPublish}
          publishOpenLabel="Edit building"
          closeLabel={canPublish ? "Close editor" : "Close"}
          variant="toolbar"
          onclick={() => (editing = !editing)}
        />
      </div>
    </div>

    {#if editing}
      <section
        class="entity-editor"
        aria-label={canPublish
          ? "Edit building details"
          : "Suggest building edits"}
      >
        <EntityEditorPanel
          {canPublish}
          showSubmitterName={!canPublish && !adminAuthStore.isLoggedIn}
          submitterNameId="building-submitter-name"
          bind:submitterName={submitterNameDraft}
          {proposalStatus}
          successMessage={savedField
            ? entityEditorSavedMessage({
                canPublish,
                savedFieldLabel: fieldLabel(savedField),
              })
            : null}
          errorMessage={fieldError}
        >
          <EntityEditorField
            label="Building name"
            inputId="building-name-editor"
            {canPublish}
            disabled={savingField !== null}
            fieldSaving={savingField === "buildingName"}
            unchanged={nameDraft.trim() === building.buildingName}
            onsave={() => saveField("buildingName")}
          >
            {#snippet control()}
              <input
                id="building-name-editor"
                bind:value={nameDraft}
                disabled={savingField !== null}
                autocomplete="off"
              />
            {/snippet}
          </EntityEditorField>

          <EntityEditorField
            label="Building directions"
            inputId="building-directions-editor"
            {canPublish}
            disabled={savingField !== null}
            fieldSaving={savingField === "directions"}
            stacked
            unchanged={directionsDraft.trim() === (building.directions ?? "")}
            onsave={() => saveField("directions")}
          >
            {#snippet control()}
              <textarea
                id="building-directions-editor"
                bind:value={directionsDraft}
                disabled={savingField !== null}
                rows="3"
              ></textarea>
            {/snippet}
          </EntityEditorField>

          <EntityEditorField
            label="Building type"
            inputId="building-type-editor"
            {canPublish}
            disabled={savingField !== null}
            fieldSaving={savingField === "buildingType"}
            unchanged={typeDraft === building.buildingType}
            onsave={() => saveField("buildingType")}
          >
            {#snippet control()}
              <select
                id="building-type-editor"
                bind:value={typeDraft}
                disabled={savingField !== null}
              >
                <option value="admin">Administrative building</option>
                <option value="non-admin">Class / academic building</option>
              </select>
            {/snippet}
          </EntityEditorField>

          {#if canPublish}
            <p class="editor-note">
              {#if mapEditStore.enabled}
                Map editing is on — drag this building's pin on the map to move
                it.
              {:else}
                To move this building's map pin,
                <button
                  type="button"
                  class="inline-link-btn"
                  onclick={() => mapEditStore.enable()}
                >
                  enable map editing
                </button>
                from the shield control, then drag its marker.
              {/if}
            </p>
          {:else if building.lat && building.lon}
            <p class="editor-note">
              {#if mapProposalStore.allowsKey(`building:${building.id}`)}
                Pin move mode is on — drag this building's marker on the map.
              {:else}
                To suggest a map pin move,
                <button
                  type="button"
                  class="inline-link-btn"
                  onclick={enablePinProposal}
                >
                  enable pin move
                </button>
                , then drag its marker.
              {/if}
            </p>
          {/if}
        </EntityEditorPanel>
      </section>
    {/if}
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
  @import "../editor/entity-editor.css";

  .building-query-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
    flex: 1 1 0;
    overflow-y: auto;
  }

  .building-header {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    width: 100%;
    flex-shrink: 0;
  }

  .building-title {
    font-size: 1.125rem;
    font-weight: bold;
    color: black;
    margin: 0;
    line-height: 1.25rem;
  }

  .building-desc {
    font-size: 0.75rem;
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

  .get-directions-btn,
  .view-3d-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.25;
    cursor: pointer;
    transition: background-color 0.2s;
    width: max-content;
  }

  .get-directions-btn {
    border: none;
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

  .view-3d-btn:hover,
  .view-3d-btn:focus-visible {
    background-color: #fdf3f3;
  }
</style>
