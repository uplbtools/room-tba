<script lang="ts">
  import LoadingIndicator from "@ui/LoadingIndicator.svelte";
  import {
    mapEditStore,
    mapProposalStore,
    queryStore,
    building3DStore,
    toastStore,
    termStore,
  } from "@lib/store.svelte";
  import { adminAuthStore } from "@lib/stores/admin-auth.svelte";
  import { getAppActions, getAppData } from "@lib/context";
  import Box from "@lucide/svelte/icons/box";
  import MapChromeActionChip from "@ui/map-chrome/MapChromeActionChip.svelte";
  import type { BuildingData, RoomData } from "@lib/types";
  import ResultDisplay from "./ResultDisplay.svelte";
  import EntityShareCopyLink from "./EntityShareCopyLink.svelte";
  import EntityGoogleMapsLink from "./EntityGoogleMapsLink.svelte";
  import EntityDirectionsChip from "./EntityDirectionsChip.svelte";
  import EntityLastUpdated from "../EntityLastUpdated.svelte";
  import EntityEditorToggle from "@ui/editor/EntityEditorToggle.svelte";
  import EntityEditorPanel from "@ui/editor/EntityEditorPanel.svelte";
  import EntityEditorField from "@ui/editor/EntityEditorField.svelte";
  import EntityEditorPinRow from "@ui/editor/EntityEditorPinRow.svelte";
  import ImageUpload from "@ui/editor/ImageUpload.svelte";
  import { fieldSaveActionLabel } from "@lib/editor/field-action-label";
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
    mergeEntityRecord,
    persistEntityChange,
  } from "@lib/proposals/client";
  import { handlePersistEntityResult } from "@lib/editor/handle-persist-result";
  import MergeEntityPrompt from "@ui/editor/MergeEntityPrompt.svelte";
  import {
    clearEntityContributorDraft,
    readEntityContributorDraft,
    scheduleEntityContributorDraftSave,
  } from "@lib/contributor-drafts";

  type BuildingEditableField =
    "buildingName" | "directions" | "buildingType" | "imageUrl";

  const appData = getAppData();
  const appActions = getAppActions();
  const { buildings, organizations, loaded } = $derived(appData());

  let pinnedBuildingId = $state<number | null>(null);

  const building = $derived.by(() => {
    if (!loaded) return null;
    const byName = buildings.find(
      (b) => b.buildingName === queryStore.queryValue,
    );
    if (byName) return byName;
    if (queryStore.category === "building" && pinnedBuildingId !== null) {
      return buildings.find((b) => b.id === pinnedBuildingId) ?? null;
    }
    return null;
  });

  $effect(() => {
    if (building?.id) pinnedBuildingId = building.id;
  });

  // Reverse-lookup: orgs and offices housed in this building.
  const buildingOrgs = $derived(
    building && organizations
      ? organizations.filter((o) => o.buildingId === building.id)
      : [],
  );

  function openOrg(name: string) {
    queryStore.updateQuery({
      category: "organization",
      type: "result",
      value: name,
    });
    queryStore.inputValue = name;
  }
  const buildingShareUrl = $derived(
    building ? getBuildingShareUrl(building.buildingName) : "",
  );
  const hasMapPin = $derived(Boolean(building?.lat && building?.lon));
  const pinProposalActive = $derived(
    building ? mapProposalStore.allowsKey(`building:${building.id}`) : false,
  );

  let buildingRooms = $state<RoomData[] | null>(null);
  let classCounts = $state<Map<number, number> | null>(null);

  // A building can be both: the stored admin flag AND a class venue (it has
  // rooms hosting classes this term). Surface both roles in the badge.
  const hostsClasses = $derived.by(() => {
    if (!classCounts) return false;
    for (const count of classCounts.values()) if (count > 0) return true;
    return false;
  });
  const buildingTypeLabel = $derived.by(() => {
    const isAdmin = building?.buildingType === "admin";
    if (isAdmin && hostsClasses) return "Administrative · Class venue";
    return isAdmin ? "Administrative" : "Class building";
  });

  let editing = $state(false);
  let draftBuildingId = $state<number | null>(null);
  let draftVersion = $state<number | null>(null);
  let nameDraft = $state("");
  let directionsDraft = $state("");
  let typeDraft = $state<BuildingData["buildingType"]>("non-admin");
  let imageDraft = $state<string | null>(null);
  let savingField = $state<BuildingEditableField | null>(null);
  let savedField = $state<BuildingEditableField | null>(null);
  let fieldError = $state<string | null>(null);
  let submitterNameDraft = $state("");
  let proposalStatus = $state<string | null>(null);
  let activeProposalId = $state<number | null>(null);
  let mergePrompt = $state<{
    candidate: BuildingData;
    attemptedName: string;
    sourceVersion: number;
  } | null>(null);
  let mergingEntity = $state(false);

  const canPublish = $derived(adminAuthStore.canPublish);

  const fieldLabels: Record<BuildingEditableField, string> = {
    buildingName: "Building name",
    directions: "Building directions",
    buildingType: "Building type",
    imageUrl: "Building photo",
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
    imageDraft = current.imageUrl ?? null;
    savedField = null;
    fieldError = null;
    mergePrompt = null;
    proposalStatus = null;
    const stored = getStoredProposalForEntity("building", current.id);
    activeProposalId = stored?.id ?? null;
    if (stored) proposalStatus = stored.status;

    if (!canPublish) {
      const saved = readEntityContributorDraft("building", current.id);
      if (saved) {
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
    appActions.upsertBuilding(updated);
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
      imageUrl?: string | null;
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
    } else if (field === "imageUrl") {
      body.imageUrl = imageDraft || null;
    }

    savingField = field;
    savedField = null;
    fieldError = null;

    try {
      const { version: _version, ...patch } = body;
      const result = await persistEntityChange({
        entityType: "building",
        entityId: current.id,
        baseVersion: current.version,
        patch,
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
        if (outcome.mergeCandidate && field === "buildingName") {
          mergePrompt = {
            candidate: outcome.mergeCandidate as BuildingData,
            attemptedName: outcome.attemptedName ?? nameDraft.trim(),
            sourceVersion: current.version,
          };
          fieldError = null;
          return;
        }
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

  function dismissMergePrompt() {
    mergePrompt = null;
    const current = building;
    if (current) nameDraft = current.buildingName;
  }

  async function confirmBuildingMerge() {
    const current = building;
    if (!current || !mergePrompt) return;

    mergingEntity = true;
    fieldError = null;

    try {
      const result = await mergeEntityRecord({
        entityType: "building",
        sourceId: current.id,
        targetId: mergePrompt.candidate.id,
        sourceVersion: mergePrompt.sourceVersion,
        preferredName: mergePrompt.attemptedName,
      });

      if (!result.ok) {
        if (result.latest)
          syncBuildingFromServer(result.latest as BuildingData);
        fieldError =
          result.error ??
          `${current.buildingName} could not be merged into ${mergePrompt.candidate.buildingName}.`;
        return;
      }

      if (result.entity) {
        syncBuildingFromServer(result.entity as BuildingData);
        toastStore.show(
          `Merged ${current.buildingName} into ${mergePrompt.candidate.buildingName}.`,
          "success",
        );
      }
      mergePrompt = null;
      editing = false;
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Network error";
      fieldError = `${current.buildingName} merge failed: ${reason}`;
    } finally {
      mergingEntity = false;
    }
  }

  const allFieldsUnchanged = $derived.by(() => {
    const current = building;
    if (!current) return true;
    return (
      nameDraft.trim() === current.buildingName &&
      directionsDraft.trim() === (current.directions ?? "") &&
      typeDraft === current.buildingType
    );
  });

  async function submitAllChanges() {
    const current = building;
    if (!current || allFieldsUnchanged) return;

    const patch: Record<string, unknown> = {};
    if (nameDraft.trim() !== current.buildingName) {
      const trimmedName = nameDraft.trim();
      if (trimmedName.length === 0) {
        fieldError = `${current.buildingName} name cannot be empty.`;
        return;
      }
      patch.buildingName = trimmedName;
    }
    if (directionsDraft.trim() !== (current.directions ?? "")) {
      patch.directions = directionsDraft.trim();
    }
    if (typeDraft !== current.buildingType) {
      patch.buildingType = typeDraft;
    }

    savingField = "buildingName" as BuildingEditableField;
    savedField = null;
    fieldError = null;

    try {
      const result = await persistEntityChange({
        entityType: "building",
        entityId: current.id,
        baseVersion: current.version,
        patch,
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
        fallbackError: `${current.buildingName} could not be saved.`,
      });

      if (outcome.error) {
        fieldError = outcome.error;
        return;
      }

      if (outcome.published) {
        savedField = "buildingName" as BuildingEditableField;
        setTimeout(() => {
          if (savedField === "buildingName") savedField = null;
        }, 1800);
        return;
      }

      if (outcome.proposal) {
        activeProposalId = outcome.proposal.id;
        proposalStatus = outcome.proposal.status;
        clearEntityContributorDraft("building", current.id);
        savedField = "buildingName" as BuildingEditableField;
        toastStore.show(
          `Suggestion for ${current.buildingName} submitted for review.`,
          "success",
        );
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Network error";
      fieldError = `${current.buildingName} failed to save: ${reason}`;
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
            toolbar
            ariaLabel="3D view"
            onclick={() => building3DStore.open(building.buildingName)}
          >
            <Box size={14} aria-hidden="true" />
            3D view
          </MapChromeActionChip>
          <EntityDirectionsChip
            lat={building.lat ?? 0}
            lon={building.lon ?? 0}
            destinationLabel={building.buildingName}
          />
          <EntityGoogleMapsLink
            lat={building.lat ?? 0}
            lon={building.lon ?? 0}
            ariaLabel={`Open ${building.buildingName} in Google Maps`}
          />
        {/if}
        <EntityShareCopyLink
          url={buildingShareUrl}
          entityLabel={building.buildingName}
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
          historyEntity={building
            ? {
                entityType: "building",
                entityId: building.id,
                version: building.version,
              }
            : null}
          bind:submitterName={submitterNameDraft}
          {proposalStatus}
          {activeProposalId}
          onWithdrawn={() => {
            activeProposalId = null;
            proposalStatus = null;
          }}
          onsubmit={submitAllChanges}
          submitting={savingField !== null}
          submitDisabled={allFieldsUnchanged}
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

          {#if mergePrompt}
            <MergeEntityPrompt
              entityKind="building"
              sourceLabel={building.buildingName}
              candidateLabel={mergePrompt.candidate.buildingName}
              detail="Merge rooms and map pins into the kept building;"
              merging={mergingEntity}
              disabled={savingField !== null}
              onconfirm={confirmBuildingMerge}
              ondismiss={dismissMergePrompt}
            />
          {/if}

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

              {#if adminAuthStore.isLoggedIn}
                <div class="editor-image-row">
                  <ImageUpload
                    label="Building photo"
                    inputId="building-image-editor"
                    prefix="buildings"
                    bind:value={imageDraft}
                    disabled={savingField !== null}
                  />
                  <button
                    type="button"
                    class="field-save-btn"
                    disabled={savingField !== null ||
                      (imageDraft ?? null) === (building.imageUrl ?? null)}
                    onclick={() => saveField("imageUrl")}
                  >
                    {fieldSaveActionLabel({
                      canPublish,
                      isSaving: savingField === "imageUrl",
                    })}
                  </button>
                </div>
              {/if}
            </div>
          </details>
        </EntityEditorPanel>
      </section>
    {:else}
      {#if building.imageUrl}
        <img
          class="entity-image"
          src={building.imageUrl}
          alt={building.buildingName}
          loading="lazy"
        />
      {/if}
      <section class="entity-directions" aria-label="Directions">
        <div class="entity-directions__segment">
          {#if building.directions}
            <p class="entity-directions__label">Directions</p>
            <p class="entity-directions__text">{building.directions}</p>
          {:else}
            <p class="entity-directions__empty">No directions listed.</p>
          {/if}
        </div>
        <EntityLastUpdated
          updatedAt={building.updatedAt}
          entityType="building"
          entityId={building.id}
        />
      </section>
    {/if}
  {:else}
    <p class="entity-loading-note">
      <LoadingIndicator label="Loading building…" />
    </p>
  {/if}

  {#if buildingOrgs.length > 0}
    <section class="building-orgs" aria-label="Organizations and offices here">
      <h3 class="entity-section-heading">Orgs &amp; offices here</h3>
      <div class="entity-tag-list">
        {#each buildingOrgs as org (org.id)}
          <button
            type="button"
            class="entity-tag-chip building-orgs__chip"
            onclick={() => openOrg(org.name)}
          >
            {org.name}
          </button>
        {/each}
      </div>
    </section>
  {/if}

  {#if buildingRooms}
    <ResultDisplay filteredRooms={buildingRooms} {classCounts} />
  {:else if building}
    <p class="entity-loading-note">
      <LoadingIndicator label="Loading rooms for {building.buildingName}…" />
    </p>
  {/if}
</div>

<style>
  @import "./entity-detail.css";
  @import "../editor/entity-editor.css";
  @import "../map-chrome/map-chrome.css";

  .building-orgs {
    padding: 0.5rem 0.25rem 0;
  }

  .building-orgs__chip {
    border: none;
    cursor: pointer;
    background-color: hsl(265, 45%, 92%);
    color: hsl(265, 45%, 34%);
  }

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
