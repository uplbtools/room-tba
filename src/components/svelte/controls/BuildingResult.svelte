<script lang="ts">
  import {
    adminAuthStore,
    mapEditStore,
    mapProposalStore,
    queryStore,
    locationStore,
    building3DStore,
    toastStore,
  } from "@lib/store.svelte";
  import { getAppActions, getAppData } from "@lib/context";
  import CornerRightUp from "@lucide/svelte/icons/corner-right-up";
  import Box from "@lucide/svelte/icons/box";
  import type { BuildingData, RoomData } from "@lib/types";
  import ResultDisplay from "./ResultDisplay.svelte";
  import CopyLinkButton from "@ui/CopyLinkButton.svelte";
  import EntityEditorToggle from "@ui/editor/EntityEditorToggle.svelte";
  import EntityEditorPanel from "@ui/editor/EntityEditorPanel.svelte";
  import EntityEditorField from "@ui/editor/EntityEditorField.svelte";
  import EntityEditorPinRow from "@ui/editor/EntityEditorPinRow.svelte";
  import { entityEditorSavedMessage } from "@lib/editor/field-action-label";
  import { onMount } from "svelte";
  import { getBuildingRooms } from "@lib/local/data/utils";
  import {
    checkLocalBuildingRoom,
    syncBuildingRooms,
  } from "@lib/local/data/sync";
  import { getBuildingShareUrl } from "@lib/share-links";
  import {
    getStoredProposalForEntity,
    persistEntityChange,
  } from "@lib/proposals/client";
  import { handlePersistEntityResult } from "@lib/editor/handle-persist-result";

  type BuildingEditableField = "buildingName" | "directions" | "buildingType";

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
  const buildingTypeLabel = $derived(
    building?.buildingType === "admin" ? "Administrative" : "Class building",
  );
  const hasMapPin = $derived(Boolean(building?.lat && building?.lon));
  const pinProposalActive = $derived(
    building ? mapProposalStore.allowsKey(`building:${building.id}`) : false,
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
      <div class="building-title-row">
        <h2 class="building-title">{building.buildingName}</h2>
        <span class="building-type-badge">{buildingTypeLabel}</span>
      </div>

      {#if !editing}
        {#if building.directions}
          <p class="building-desc">{building.directions}</p>
        {:else}
          <p class="building-desc building-desc--empty">No directions listed.</p>
        {/if}
      {/if}

      {#if hasMapPin}
        <div class="building-primary-actions">
          <button
            class="get-directions-btn"
            type="button"
            onclick={() => {
              locationStore.requestLocation();
              locationStore.setDestination([
                building.lon ?? 0,
                building.lat ?? 0,
              ]);
            }}
          >
            Get Directions
            <CornerRightUp size={16} aria-hidden="true" />
          </button>
        </div>
      {/if}

      <div class="building-secondary-actions">
        {#if hasMapPin}
          <button
            class="secondary-btn"
            type="button"
            onclick={() => building3DStore.open(building.buildingName)}
          >
            <Box size={14} aria-hidden="true" />
            3D view
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
      </div>
    </div>

    <section
      class="entity-editor"
      aria-label={canPublish ? "Edit building details" : "Suggest building edits"}
    >
      <EntityEditorToggle
        expanded={editing}
        {canPublish}
        publishOpenLabel="Edit building"
        onclick={() => (editing = !editing)}
      />
      {#if editing}
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

          {#if hasMapPin}
            {#if canPublish}
              <EntityEditorPinRow
                label={mapEditStore.enabled
                  ? "Map pin — drag marker on map"
                  : "Map pin"}
                pickLabel={mapEditStore.enabled ? "Active" : "Enable map edit"}
                disabled={mapEditStore.enabled || savingField !== null}
                onclick={() => mapEditStore.enable()}
              />
            {:else}
              <EntityEditorPinRow
                label={pinProposalActive
                  ? "Pin move — drag marker on map"
                  : "Map pin"}
                pickLabel={pinProposalActive ? "Active" : "Suggest move"}
                disabled={pinProposalActive || savingField !== null}
                onclick={enablePinProposal}
              />
            {/if}
          {/if}

          <details class="editor-advanced">
            <summary>More fields</summary>
            <div class="editor-advanced-fields">
              <EntityEditorField
                label="Building directions"
                inputId="building-directions-editor"
                {canPublish}
                disabled={savingField !== null}
                fieldSaving={savingField === "directions"}
                stacked
                unchanged={directionsDraft.trim() ===
                  (building.directions ?? "")}
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
            </div>
          </details>
        </EntityEditorPanel>
      {/if}
    </section>
  {:else}
    <p class="loading-note">Loading building…</p>
  {/if}

  {#if buildingRooms}
    <ResultDisplay filteredRooms={buildingRooms} />
  {:else if building}
    <p class="loading-note">Loading rooms…</p>
  {/if}
</div>

<style>
  @import "../editor/entity-editor.css";

  .building-query-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
    flex: 1 1 0;
    overflow-y: auto;
  }

  .building-header {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    width: 100%;
    flex-shrink: 0;
  }

  .building-title-row {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.375rem 0.5rem;
    min-width: 0;
  }

  .building-title {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 1.125rem;
    font-weight: bold;
    color: black;
    margin: 0;
    line-height: 1.25rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .building-type-badge {
    flex-shrink: 0;
    font-size: 0.6875rem;
    color: #7b1113;
    background-color: hsl(5, 53%, 95%);
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .building-desc {
    font-size: 0.8125rem;
    color: #4f4f4f;
    margin: 0;
    line-height: 1.45;
  }

  .building-desc--empty {
    color: #71717a;
    font-style: italic;
  }

  .building-primary-actions,
  .building-secondary-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    align-items: center;
  }

  .building-secondary-actions {
    gap: 0.5rem;
  }

  .get-directions-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.8125rem;
    font-weight: 600;
    line-height: 1.25;
    cursor: pointer;
    background-color: #7b1113;
    color: white;
    width: max-content;
    max-width: 100%;
  }

  .get-directions-btn:hover,
  .get-directions-btn:focus-visible {
    background-color: #9a1517;
  }

  .get-directions-btn:focus-visible {
    outline: 2px solid #7b1113;
    outline-offset: 2px;
  }

  .secondary-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.3125rem 0.625rem;
    border-radius: 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1.25;
    cursor: pointer;
    background-color: white;
    color: #7b1113;
    border: 1px solid #d8b9ba;
    width: max-content;
    max-width: 100%;
  }

  .secondary-btn:hover,
  .secondary-btn:focus-visible {
    background-color: #fdf3f3;
  }

  .secondary-btn:focus-visible {
    outline: 2px solid #7b1113;
    outline-offset: 2px;
  }

  .editor-advanced {
    border: 1px solid hsl(5, 53%, 90%);
    border-radius: 0.5rem;
    background: white;
  }

  .editor-advanced summary {
    cursor: pointer;
    padding: 0.45rem 0.55rem;
    font-size: 0.75rem;
    font-weight: 700;
    color: hsl(5, 53%, 32%);
    list-style: none;
  }

  .editor-advanced summary::-webkit-details-marker {
    display: none;
  }

  .editor-advanced summary::after {
    content: "▾";
    float: right;
    color: hsl(5, 53%, 45%);
    transition: transform 0.15s ease;
  }

  .editor-advanced[open] summary::after {
    transform: rotate(-180deg);
  }

  .editor-advanced-fields {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0 0.55rem 0.55rem;
    border-top: 1px solid hsl(5, 53%, 92%);
  }

  .loading-note {
    margin: 0;
    font-size: 0.8125rem;
    color: #71717a;
  }

  @media (prefers-reduced-motion: reduce) {
    .editor-advanced summary::after {
      transition: none;
    }
  }
</style>
