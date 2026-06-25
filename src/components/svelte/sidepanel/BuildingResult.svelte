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

      if (!result.ok) {
        if (result.latest) {
          syncBuildingFromServer(result.latest as BuildingData);
        }
        fieldError =
          result.error ??
          `${current.buildingName} ${fieldLabel(field)} could not be saved.`;
        return;
      }

      if (result.published) {
        syncBuildingFromServer(result.published as BuildingData);
        savedField = field;
        setTimeout(() => {
          if (savedField === field) savedField = null;
        }, 1800);
        return;
      }

      if (result.proposal) {
        activeProposalId = result.proposal.id;
        proposalStatus = result.proposal.status;
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
        {#if canPublish}
          <button
            type="button"
            class="edit-building-btn"
            aria-expanded={editing}
            onclick={() => (editing = !editing)}
          >
            {editing ? "Close editor" : "Edit building"}
          </button>
        {:else}
          <button
            type="button"
            class="edit-building-btn"
            aria-expanded={editing}
            onclick={() => (editing = !editing)}
          >
            {editing ? "Close" : "Suggest an edit"}
          </button>
        {/if}
      </div>
    </div>

    {#if editing}
      <section
        class="building-editor"
        aria-label={canPublish
          ? "Edit building details"
          : "Suggest building edits"}
      >
        <div class="editor-heading">
          <span>{canPublish ? "Editor" : "Suggest a change"}</span>
        </div>

        {#if !canPublish && !adminAuthStore.isLoggedIn}
          <div class="editor-field">
            <label for="building-submitter-name">Your name</label>
            <input
              id="building-submitter-name"
              bind:value={submitterNameDraft}
              maxlength="100"
              autocomplete="name"
              placeholder="How should we credit this suggestion?"
            />
          </div>
        {/if}

        {#if proposalStatus}
          <p class="editor-message pending">
            Status: {proposalStatus.replace("_", " ")} — waiting for editor review.
          </p>
        {/if}

        <div class="editor-field">
          <label for="building-name-editor">Building name</label>
          <div class="editor-control-row">
            <input
              id="building-name-editor"
              bind:value={nameDraft}
              disabled={savingField !== null}
              autocomplete="off"
            />
            <button
              class="field-save-btn"
              disabled={savingField !== null ||
                nameDraft.trim() === building.buildingName}
              onclick={() => saveField("buildingName")}
            >
              {savingField === "buildingName"
                ? canPublish
                  ? "Saving..."
                  : "Submitting..."
                : canPublish
                  ? "Save"
                  : "Submit"}
            </button>
          </div>
        </div>

        <div class="editor-field">
          <label for="building-directions-editor">Building directions</label>
          <div class="editor-control-row stacked">
            <textarea
              id="building-directions-editor"
              bind:value={directionsDraft}
              disabled={savingField !== null}
              rows="3"></textarea>
            <button
              class="field-save-btn"
              disabled={savingField !== null ||
                directionsDraft.trim() === (building.directions ?? "")}
              onclick={() => saveField("directions")}
            >
              {savingField === "directions"
                ? canPublish
                  ? "Saving..."
                  : "Submitting..."
                : canPublish
                  ? "Save"
                  : "Submit"}
            </button>
          </div>
        </div>

        <div class="editor-field">
          <label for="building-type-editor">Building type</label>
          <div class="editor-control-row">
            <select
              id="building-type-editor"
              bind:value={typeDraft}
              disabled={savingField !== null}
            >
              <option value="admin">Administrative building</option>
              <option value="non-admin">Class / academic building</option>
            </select>
            <button
              class="field-save-btn"
              disabled={savingField !== null ||
                typeDraft === building.buildingType}
              onclick={() => saveField("buildingType")}
            >
              {savingField === "buildingType"
                ? canPublish
                  ? "Saving..."
                  : "Submitting..."
                : canPublish
                  ? "Save"
                  : "Submit"}
            </button>
          </div>
        </div>

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

        {#if savedField}
          <p class="editor-message success">
            {canPublish
              ? `${fieldLabel(savedField)} saved.`
              : "Suggestion submitted."}
          </p>
        {/if}
        {#if fieldError}
          <p class="editor-message error">{fieldError}</p>
        {/if}
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
  .view-3d-btn,
  .edit-building-btn {
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

  .edit-building-btn {
    font: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.25;
  }

  .get-directions-btn {
    border: none;
    background-color: #7b1113;
    color: white;
  }

  .get-directions-btn:hover {
    background-color: #9a1517;
  }

  .view-3d-btn,
  .edit-building-btn {
    background-color: white;
    color: #7b1113;
    border: 1px solid #d8b9ba;
  }

  .view-3d-btn:hover,
  .edit-building-btn:hover,
  .edit-building-btn:focus-visible {
    background-color: #fdf3f3;
  }

  .edit-building-btn:focus-visible {
    outline: 2px solid #7b1113;
    outline-offset: 2px;
  }

  .building-editor {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.625rem;
    border: 1px solid hsl(5, 53%, 88%);
    border-radius: 0.625rem;
    background-color: hsl(5, 53%, 98%);
  }

  .editor-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;
    color: hsl(5, 53%, 32%);
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .editor-field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .editor-field label {
    color: #555;
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .editor-control-row {
    display: flex;
    gap: 0.375rem;
    align-items: stretch;
  }

  .editor-control-row.stacked {
    flex-direction: column;
  }

  .editor-control-row input,
  .editor-control-row select,
  .editor-control-row textarea {
    min-width: 0;
    flex: 1;
    border: 1px solid #d8d8d8;
    border-radius: 0.5rem;
    padding: 0.45rem 0.55rem;
    font: inherit;
    font-size: 0.8125rem;
    color: #222;
    background: white;
  }

  .editor-control-row textarea {
    resize: vertical;
    min-height: 4.5rem;
  }

  .field-save-btn {
    flex-shrink: 0;
    border: 1px solid #d8b9ba;
    border-radius: 0.5rem;
    background: white;
    color: #7b1113;
    cursor: pointer;
    font: inherit;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.45rem 0.65rem;
  }

  .field-save-btn:hover:not(:disabled),
  .field-save-btn:focus-visible:not(:disabled) {
    background: #fdf3f3;
  }

  .field-save-btn:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .editor-note {
    margin: 0;
    color: #666;
    font-size: 0.75rem;
    line-height: 1.45;
  }

  .inline-link-btn {
    border: none;
    background: none;
    color: #7b1113;
    cursor: pointer;
    font: inherit;
    font-size: inherit;
    font-weight: 700;
    padding: 0;
    text-decoration: underline;
  }

  .editor-message {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .editor-message.pending {
    color: hsl(35, 80%, 28%);
  }

  .editor-message.success {
    color: hsl(160, 84%, 26%);
  }

  .editor-message.error {
    color: hsl(0, 70%, 38%);
  }
</style>
