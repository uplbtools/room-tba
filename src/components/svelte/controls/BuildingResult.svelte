<script lang="ts">
  import {
    adminAuthStore,
    mapEditStore,
    mapProposalStore,
    queryStore,
    locationStore,
    building3DStore,
    toastStore,
    termStore,
  } from "@lib/store.svelte";
  import { getAppActions, getAppData } from "@lib/context";
  import CornerRightUp from "@lucide/svelte/icons/corner-right-up";
  import Box from "@lucide/svelte/icons/box";
  import MapChromeActionChip from "@ui/map-chrome/MapChromeActionChip.svelte";
  import type { BuildingData, RoomData } from "@lib/types";
  import ResultDisplay from "./ResultDisplay.svelte";
  import CopyLinkButton from "@ui/CopyLinkButton.svelte";
  import EntityEditorToggle from "@ui/editor/EntityEditorToggle.svelte";
  import EntityEditorPanel from "@ui/editor/EntityEditorPanel.svelte";
  import EntityEditorField from "@ui/editor/EntityEditorField.svelte";
  import EntityEditorPinRow from "@ui/editor/EntityEditorPinRow.svelte";
  import { entityEditorSavedMessage } from "@lib/editor/field-action-label";
  import { tick } from "svelte";
  import {
    getBuildingRooms,
    fetchRoomClassCounts,
  } from "@lib/local/data/utils";
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
  import {
    clearEntityContributorDraft,
    readEntityContributorDraft,
    scheduleEntityContributorDraftSave,
  } from "@lib/contributor-drafts";

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
  let classCounts = $state<Map<number, number> | null>(null);

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

  // Room list must reload when the selected building changes (search result,
  // pin, breadcrumb). BuildingResult is not remounted on switch, so onMount
  // would only fire once and leave a stale list. Key the load on building id
  // and discard in-flight fetches from a previous selection (#340).
  let roomLoadGeneration = 0;

  $effect(() => {
    const id = building?.id;
    if (id == null) {
      buildingRooms = null;
      return;
    }
    const gen = ++roomLoadGeneration;
    buildingRooms = null;
    void (async () => {
      const buildingChecker = await checkLocalBuildingRoom(id);
      const rooms = await getBuildingRooms(buildingChecker, id);
      if (gen !== roomLoadGeneration) return;
      buildingRooms = rooms;
      await syncBuildingRooms(buildingChecker, id, rooms);
    })();
  });

  // Class counts per room for the active term, batched in one request so the
  // room list preview doesn't fire N+1 /api/classes calls (#342). Re-fetches
  // when the building or the active term changes; null while loading/offline.
  let classCountGeneration = 0;

  $effect(() => {
    const id = building?.id;
    const termId = termStore.activeTermId;
    if (id == null) {
      classCounts = null;
      return;
    }
    const gen = ++classCountGeneration;
    void (async () => {
      const counts = await fetchRoomClassCounts(
        "building",
        id,
        termId ?? undefined,
      );
      if (gen !== classCountGeneration) return;
      classCounts = counts;
    })();
  });

  function applyAutoEditIntent() {
    const raw = sessionStorage.getItem("room-tba:auto-edit");
    if (!raw || !building) return;
    try {
      const intent = JSON.parse(raw) as {
        entity?: string;
        field?: string;
        buildingName?: string;
      };
      if (
        intent.entity !== "building" ||
        intent.field !== "directions" ||
        intent.buildingName !== building.buildingName
      ) {
        return;
      }
      sessionStorage.removeItem("room-tba:auto-edit");
      editing = true;
      void tick().then(() =>
        document.getElementById("building-directions-editor")?.focus(),
      );
    } catch {
      sessionStorage.removeItem("room-tba:auto-edit");
    }
  }

  $effect(() => {
    if (building) applyAutoEditIntent();
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

    if (!canPublish) {
      const saved = readEntityContributorDraft("building", current.id);
      if (saved) {
        if (saved.editing) editing = true;
        if (typeof saved.fields.nameDraft === "string") {
          nameDraft = saved.fields.nameDraft;
        }
        if (typeof saved.fields.directionsDraft === "string") {
          directionsDraft = saved.fields.directionsDraft;
        }
        if (
          saved.fields.typeDraft === "admin" ||
          saved.fields.typeDraft === "non-admin"
        ) {
          typeDraft = saved.fields.typeDraft;
        }
      }
    }
  });

  $effect(() => {
    if (canPublish || !editing || !building) return;
    scheduleEntityContributorDraftSave("building", building.id, () => ({
      editing: true,
      fields: { nameDraft, directionsDraft, typeDraft },
    }));
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
        clearEntityContributorDraft("building", current.id);
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

<div class="entity-detail building-query-wrapper">
  {#if building}
    <header class="entity-header">
      <div class="entity-header__title-row">
        <h2 class="entity-header__title">{building.buildingName}</h2>
        <span class="entity-header__badge">{buildingTypeLabel}</span>
      </div>

      <div class="entity-actions">
        {#if hasMapPin}
          <MapChromeActionChip
            onclick={() => building3DStore.open(building.buildingName)}
          >
            <Box size={14} aria-hidden="true" />
            3D view
          </MapChromeActionChip>
          <MapChromeActionChip
            onclick={() => {
              locationStore.requestLocation();
              locationStore.setDestination([
                building.lon ?? 0,
                building.lat ?? 0,
              ]);
            }}
          >
            <CornerRightUp size={14} aria-hidden="true" />
            Directions
          </MapChromeActionChip>
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
          variant="toolbar"
          onclick={() => (editing = !editing)}
        />
      </div>
    </header>

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

          {#if hasMapPin}
            {#if canPublish}
              <EntityEditorPinRow
                label={mapEditStore.enabled
                  ? "Map pin: drag marker on map"
                  : "Map pin"}
                pickLabel={mapEditStore.enabled ? "Active" : "Enable map edit"}
                disabled={mapEditStore.enabled || savingField !== null}
                onclick={() => mapEditStore.enable()}
              />
            {:else}
              <EntityEditorPinRow
                label={pinProposalActive
                  ? "Pin move: drag marker on map"
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
                    rows="3"></textarea>
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
      </section>
    {:else}
      <section class="entity-directions" aria-label="Directions">
        <div class="entity-directions__segment">
          {#if building.directions}
            <p class="entity-directions__text">{building.directions}</p>
          {:else}
            <p class="entity-directions__empty">No directions listed.</p>
          {/if}
        </div>
      </section>
    {/if}
  {:else}
    <p class="entity-loading-note">Loading building…</p>
  {/if}

  {#if buildingRooms}
    <ResultDisplay filteredRooms={buildingRooms} {classCounts} />
  {:else if building}
    <p class="entity-loading-note">
      Loading rooms for {building.buildingName}…
    </p>
  {/if}
</div>

<style>
  @import "./entity-detail.css";
  @import "../editor/entity-editor.css";
  @import "../map-chrome/map-chrome.css";

  .building-query-wrapper {
    gap: 0.625rem;
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

  @media (prefers-reduced-motion: reduce) {
    .editor-advanced summary::after {
      transition: none;
    }
  }
</style>
