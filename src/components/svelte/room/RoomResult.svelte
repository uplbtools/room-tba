<script lang="ts">
  import { onMount } from "svelte";
  import {
    adminAuthStore,
    building3DStore,
    currentRoom,
    modalStore,
    queryStore,
    roomClassesStore,
    termStore,
    toastStore,
  } from "@lib/store.svelte";
  import {
    getStoredProposalForEntity,
    mergeEntityRooms,
    persistEntityChange,
  } from "@lib/proposals/client";
  import { handlePersistEntityResult } from "@lib/editor/handle-persist-result";
  import {
    clearEntityContributorDraft,
    readEntityContributorDraft,
    scheduleEntityContributorDraftSave,
  } from "@lib/contributor-drafts";
  import { getAppData } from "@lib/context";
  import EntityGoogleMapsLink from "../controls/EntityGoogleMapsLink.svelte";
  import EntityDirectionsChip from "../controls/EntityDirectionsChip.svelte";
  import EntityEditorToggle from "@ui/editor/EntityEditorToggle.svelte";
  import EntityEditorPanel from "@ui/editor/EntityEditorPanel.svelte";
  import EntityEditorField from "@ui/editor/EntityEditorField.svelte";
  import ImageUpload from "@ui/editor/ImageUpload.svelte";
  import { fieldSaveActionLabel } from "@lib/editor/field-action-label";
  import { entityEditorSavedMessage } from "@lib/editor/field-action-label";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import Box from "@lucide/svelte/icons/box";
  import EntityShareCopyLink from "../controls/EntityShareCopyLink.svelte";
  import EntityLastUpdated from "../EntityLastUpdated.svelte";
  import MapChromeActionChip from "../map-chrome/MapChromeActionChip.svelte";
  import { getRoomShareUrl } from "@lib/share-links";
  import { ROOM_SCHEDULE_SCOPE_NOTE } from "@lib/amis/room-scheduled-types";
  import { fetchFinalExams, FINALS_SCOPE_NOTE } from "@lib/final-exams";
  import {
    ROOM_CATEGORIES,
    ROOM_CATEGORY_LABELS,
    roomCategoryLabel,
  } from "@constants/room-categories";
  import type { FinalExamRow, RoomData } from "@lib/types";
  import Classes from "./Classes.svelte";
  import FinalExamsList from "./FinalExamsList.svelte";
    import TermSelector from "@ui/TermSelector.svelte";

  type RoomEditableField =
    | "roomCode"
    | "directions"
    | "buildingId"
    | "collegeId"
    | "divisionId"
    | "imageUrl"
    | "category";

  const appData = getAppData();
  const app = $derived(appData());
  const buildings = $derived(app.loaded ? app.buildings : []);
  const colleges = $derived(app.loaded ? app.colleges : []);
  const divisions = $derived(app.loaded ? app.divisions : []);

  const fieldLabels: Record<RoomEditableField, string> = {
    roomCode: "Room code",
    directions: "Room directions",
    buildingId: "Building",
    collegeId: "College",
    divisionId: "Division",
    imageUrl: "Room photo",
    category: "Room category",
  };

  let draftRoomId = $state<number | null>(null);
  let draftVersion = $state<number | null>(null);
  let codeDraft = $state("");
  let directionsDraft = $state("");
  let buildingDraft = $state("");
  let collegeDraft = $state("");
  let divisionDraft = $state("");
  let imageDraft = $state<string | null>(null);
  let categoryDraft = $state("");
  let savingField = $state<RoomEditableField | null>(null);
  let savedField = $state<RoomEditableField | null>(null);
  let fieldError = $state<string | null>(null);
  let editing = $state(false);
  let submitterNameDraft = $state("");
  let proposalStatus = $state<string | null>(null);
  let activeProposalId = $state<number | null>(null);
  let mergePrompt = $state<{
    candidate: RoomData;
    attemptedName: string;
    sourceVersion: number;
  } | null>(null);
  let mergingRooms = $state(false);
  const canPublish = $derived(adminAuthStore.canPublish);
  const roomShareUrl = $derived(
    currentRoom.value ? getRoomShareUrl(currentRoom.value) : "",
  );
  const activeTermLabel = $derived(termStore.activeTerm?.label ?? null);

  let finalExams = $state<FinalExamRow[]>([]);
  let finalExamsLoading = $state(false);
  let finalExamsRequestKey = $state<string | null>(null);

  onMount(() => {
    termStore.init();
  });

  $effect(() => {
    const code = currentRoom.value?.code;
    const termId = termStore.activeTermId;
    if (!code) {
      roomClassesStore.clear();
      return;
    }
    void roomClassesStore.load(code, termId);
  });

  $effect(() => {
    const code = currentRoom.value?.code;
    const termId = termStore.activeTermId;
    if (!code || termId == null) {
      finalExams = [];
      finalExamsLoading = false;
      return;
    }

    const key = `${code}::${termId}`;
    finalExamsRequestKey = key;
    finalExamsLoading = true;

    void fetchFinalExams({ roomCode: code, termId }).then((rows) => {
      if (finalExamsRequestKey !== key) return;
      finalExams = rows;
      finalExamsLoading = false;
    });
  });

  $effect(() => {
    const room = currentRoom.value;
    if (!room) return;
    if (draftRoomId === room.id && draftVersion === room.version) return;

    draftRoomId = room.id;
    draftVersion = room.version;
    codeDraft = room.code;
    directionsDraft = room.directions ?? "";
    buildingDraft = room.buildingId === null ? "" : String(room.buildingId);
    collegeDraft = room.collegeId === null ? "" : String(room.collegeId);
    divisionDraft = room.divisionId === null ? "" : String(room.divisionId);
    imageDraft = room.imageUrl ?? null;
    categoryDraft = room.category ?? "";
    savedField = null;
    fieldError = null;
    mergePrompt = null;
    proposalStatus = null;
    const stored = getStoredProposalForEntity("room", room.id);
    activeProposalId = stored?.id ?? null;
    if (stored) proposalStatus = stored.status;

    if (!canPublish) {
      const saved = readEntityContributorDraft("room", room.id);
      if (saved) {
        // if (saved.editing) editing = true;
        if (typeof saved.fields.codeDraft === "string") {
          codeDraft = saved.fields.codeDraft;
        }
        if (typeof saved.fields.directionsDraft === "string") {
          directionsDraft = saved.fields.directionsDraft;
        }
        if (typeof saved.fields.buildingDraft === "string") {
          buildingDraft = saved.fields.buildingDraft;
        }
        if (typeof saved.fields.collegeDraft === "string") {
          collegeDraft = saved.fields.collegeDraft;
        }
        if (typeof saved.fields.divisionDraft === "string") {
          divisionDraft = saved.fields.divisionDraft;
        }
      }
    }
  });

  $effect(() => {
    const room = currentRoom.value;
    if (canPublish || !editing || !room) return;
    scheduleEntityContributorDraftSave("room", room.id, () => ({
      editing: true,
      fields: {
        codeDraft,
        directionsDraft,
        buildingDraft,
        collegeDraft,
        divisionDraft,
      },
    }));
  });

  function fieldLabel(field: RoomEditableField) {
    return fieldLabels[field];
  }

  function selectValueToId(value: string) {
    return value === "" ? null : Number(value);
  }

  function syncRoomFromServer(room: RoomData) {
    currentRoom.setRoom(room);
    queryStore.hydrateQuery({
      type: "result",
      category: "room",
      value: room.code,
    });
  }

  async function saveField(field: RoomEditableField) {
    const room = currentRoom.value;
    if (!room) return;

    const body: {
      version: number;
      roomCode?: string;
      directions?: string | null;
      buildingId?: number | null;
      collegeId?: number | null;
      divisionId?: number | null;
      imageUrl?: string | null;
      category?: string | null;
    } = { version: room.version };

    if (field === "roomCode") {
      const trimmedCode = codeDraft.trim();
      if (trimmedCode.length === 0) {
        fieldError = `${room.code} room code cannot be empty.`;
        return;
      }
      body.roomCode = trimmedCode;
    } else if (field === "directions") {
      body.directions = directionsDraft.trim() || null;
    } else if (field === "buildingId") {
      body.buildingId = selectValueToId(buildingDraft);
    } else if (field === "collegeId") {
      body.collegeId = selectValueToId(collegeDraft);
    } else if (field === "divisionId") {
      body.divisionId = selectValueToId(divisionDraft);
    } else if (field === "imageUrl") {
      body.imageUrl = imageDraft || null;
    } else if (field === "category") {
      body.category = categoryDraft || null;
    }

    savingField = field;
    savedField = null;
    fieldError = null;
    mergePrompt = null;

    try {
      const { version: _version, ...patch } = body;
      const result = await persistEntityChange({
        entityType: "room",
        entityId: room.id,
        baseVersion: room.version,
        patch,
        entityLabel: room.code,
        canPublish,
        submitterName:
          adminAuthStore.displayName ??
          adminAuthStore.username ??
          submitterNameDraft,
        proposalId: activeProposalId,
      });

      const outcome = handlePersistEntityResult<RoomData>(result, {
        syncFromServer: syncRoomFromServer,
        fallbackError: `${room.code} ${fieldLabel(field)} could not be saved.`,
      });

      if (outcome.error) {
        if (outcome.mergeCandidate && field === "roomCode") {
          mergePrompt = {
            candidate: outcome.mergeCandidate as RoomData,
            attemptedName: outcome.attemptedName ?? codeDraft.trim(),
            sourceVersion: room.version,
          };
          fieldError = null;
          return;
        }
        fieldError = outcome.error;
        return;
      }

      if (outcome.proposal) {
        activeProposalId = outcome.proposal.id;
        proposalStatus = outcome.proposal.status;
        clearEntityContributorDraft("room", room.id);
        toastStore.show(
          `Suggestion for ${room.code} submitted for review.`,
          "success",
        );
      }
      savedField = field;
      setTimeout(() => {
        if (savedField === field) savedField = null;
      }, 1800);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Network error";
      fieldError = `${room.code} ${fieldLabel(field)} failed to save: ${reason}`;
    } finally {
      savingField = null;
    }
  }

  function dismissMergePrompt() {
    mergePrompt = null;
    const room = currentRoom.value;
    if (room) codeDraft = room.code;
  }

  async function confirmRoomMerge() {
    const room = currentRoom.value;
    if (!room || !mergePrompt) return;

    mergingRooms = true;
    fieldError = null;

    try {
      const result = await mergeEntityRooms({
        sourceRoomId: room.id,
        targetRoomId: mergePrompt.candidate.id,
        sourceVersion: mergePrompt.sourceVersion,
        preferredRoomCode: mergePrompt.attemptedName,
      });

      if (!result.ok) {
        if (result.latest) syncRoomFromServer(result.latest);
        fieldError =
          result.error ??
          `${room.code} could not be merged into ${mergePrompt.candidate.code}.`;
        return;
      }

      if (result.room) {
        syncRoomFromServer(result.room);
        toastStore.show(
          `Merged ${room.code} into ${result.room.code}.`,
          "success",
        );
      }
      mergePrompt = null;
      editing = false;
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Network error";
      fieldError = `${room.code} merge failed: ${reason}`;
    } finally {
      mergingRooms = false;
    }
  }

  function mergeCandidateLabel(candidate: RoomData) {
    const building = candidate.building?.name;
    return building ? `${candidate.code} (${building})` : candidate.code;
  }

  const parentBuilding = $derived.by(() => {
    const room = currentRoom.value;
    if (!room) return null;

    if (room.building?.name) {
      return room.building;
    }

    if (room.buildingId === null) return null;

    const building = buildings.find((item) => item.id === room.buildingId);
    if (!building) return null;

    return {
      name: building.buildingName,
      lat: building.lat,
      lon: building.lon,
      directions: building.directions,
    };
  });

  function openBuildingResult() {
    const buildingName = parentBuilding?.name;
    if (!buildingName) return;
    queryStore.updateQuery({
      type: "result",
      category: "building",
      value: buildingName,
    });
  }

  const allFieldsUnchanged = $derived.by(() => {
    const room = currentRoom.value;
    if (!room) return true;
    return (
      codeDraft.trim() === room.code &&
      directionsDraft.trim() === (room.directions ?? "") &&
      buildingDraft === String(room.buildingId ?? "") &&
      collegeDraft === String(room.collegeId ?? "") &&
      divisionDraft === String(room.divisionId ?? "") &&
      categoryDraft === (room.category ?? "")
    );
  });

  async function submitAllChanges() {
    const room = currentRoom.value;
    if (!room || allFieldsUnchanged) return;

    const patch: Record<string, unknown> = {};
    if (codeDraft.trim() !== room.code) {
      const trimmedCode = codeDraft.trim();
      if (trimmedCode.length === 0) {
        fieldError = `${room.code} room code cannot be empty.`;
        return;
      }
      patch.roomCode = trimmedCode;
    }
    if (directionsDraft.trim() !== (room.directions ?? "")) {
      patch.directions = directionsDraft.trim() || null;
    }
    if (buildingDraft !== String(room.buildingId ?? "")) {
      patch.buildingId = selectValueToId(buildingDraft);
    }
    if (collegeDraft !== String(room.collegeId ?? "")) {
      patch.collegeId = selectValueToId(collegeDraft);
    }
    if (divisionDraft !== String(room.divisionId ?? "")) {
      patch.divisionId = selectValueToId(divisionDraft);
    }
    if (categoryDraft !== (room.category ?? "")) {
      patch.category = categoryDraft || null;
    }

    savingField = "roomCode" as RoomEditableField;
    savedField = null;
    fieldError = null;
    mergePrompt = null;

    try {
      const result = await persistEntityChange({
        entityType: "room",
        entityId: room.id,
        baseVersion: room.version,
        patch,
        entityLabel: room.code,
        canPublish,
        submitterName:
          adminAuthStore.displayName ??
          adminAuthStore.username ??
          submitterNameDraft,
        proposalId: activeProposalId,
      });

      const outcome = handlePersistEntityResult<RoomData>(result, {
        syncFromServer: syncRoomFromServer,
        fallbackError: `${room.code} could not be saved.`,
      });

      if (outcome.error) {
        fieldError = outcome.error;
        return;
      }

      if (outcome.proposal) {
        activeProposalId = outcome.proposal.id;
        proposalStatus = outcome.proposal.status;
        clearEntityContributorDraft("room", room.id);
        toastStore.show(
          `Suggestion for ${room.code} submitted for review.`,
          "success",
        );
      }
      savedField = "roomCode" as RoomEditableField;
      setTimeout(() => {
        if (savedField === "roomCode") savedField = null;
      }, 1800);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Network error";
      fieldError = `${room.code} failed to save: ${reason}`;
    } finally {
      savingField = null;
    }
  }

</script>

<div class="entity-detail">
  {#if currentRoom.value}
    <header class="entity-header">
      {#if parentBuilding}
        <button
          class="entity-header__breadcrumb"
          type="button"
          onclick={openBuildingResult}
          aria-label={`Back to ${parentBuilding.name}`}
        >
          <ChevronLeft size={14} aria-hidden="true" />
          <span>{parentBuilding.name}</span>
        </button>
      {/if}

      <h2 class="entity-header__title">{currentRoom.value.code}</h2>

      {#if roomCategoryLabel(currentRoom.value.category)}
        <span class="room-category-badge"
          >{roomCategoryLabel(currentRoom.value.category)}</span
        >
      {/if}

      {#if currentRoom.value.collegeName}
        <p class="entity-header__context">
          {currentRoom.value.collegeName}
        </p>
      {/if}

      <div class="entity-actions">
        {#if parentBuilding?.lat && parentBuilding.lon}
          <EntityDirectionsChip
            lat={parentBuilding.lat}
            lon={parentBuilding.lon}
            destinationLabel={parentBuilding.name}
          />
          <EntityGoogleMapsLink
            lat={parentBuilding.lat}
            lon={parentBuilding.lon}
            ariaLabel={`Open ${parentBuilding.name} in Google Maps`}
          />
        {/if}
        {#if parentBuilding?.lat && parentBuilding.lon}
          <MapChromeActionChip
            toolbar
            ariaLabel="Move in 3D"
            onclick={() =>
              building3DStore.open(parentBuilding.name, {
                roomCode: currentRoom.value?.code,
                editMode: canPublish,
              })}
          >
            <Box size={14} aria-hidden="true" />
            Move in 3D
          </MapChromeActionChip>
        {/if}
        <EntityShareCopyLink
          url={roomShareUrl}
          entityLabel={currentRoom.value.code}
        />
        <EntityEditorToggle
          expanded={editing}
          {canPublish}
          publishOpenLabel="Edit room"
          variant="toolbar"
          onclick={() => (editing = !editing)}
        />
      </div>
    </header>

    {#if editing}
      <section class="entity-editor" aria-label="Edit room details">
        <EntityEditorPanel
          {canPublish}
          showSubmitterName={!canPublish && !adminAuthStore.isLoggedIn}
          submitterNameId="room-submitter-name"
          historyEntity={currentRoom.value ? { entityType: "room", entityId: currentRoom.value.id, version: currentRoom.value.version } : null}
          bind:submitterName={submitterNameDraft}
          {proposalStatus}
          activeProposalId={activeProposalId}
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
            label="Room code"
            inputId="room-code-editor"
            {canPublish}
            disabled={savingField !== null}
            fieldSaving={savingField === "roomCode"}
            unchanged={codeDraft.trim() === currentRoom.value.code}
            onsave={() => saveField("roomCode")}
          >
            {#snippet control()}
              <input
                id="room-code-editor"
                bind:value={codeDraft}
                disabled={savingField !== null}
                autocomplete="off"
              />
            {/snippet}
          </EntityEditorField>

          <EntityEditorField
            label="Room directions"
            inputId="room-directions-editor"
            {canPublish}
            disabled={savingField !== null}
            fieldSaving={savingField === "directions"}
            stacked
            unchanged={directionsDraft.trim() ===
              (currentRoom.value.directions ?? "")}
            onsave={() => saveField("directions")}
          >
            {#snippet control()}
              <textarea
                id="room-directions-editor"
                bind:value={directionsDraft}
                disabled={savingField !== null}
                rows="3"></textarea>
            {/snippet}
          </EntityEditorField>

          <EntityEditorField
            label="Room category"
            inputId="room-category-editor"
            {canPublish}
            disabled={savingField !== null}
            fieldSaving={savingField === "category"}
            unchanged={categoryDraft === (currentRoom.value.category ?? "")}
            onsave={() => saveField("category")}
          >
            {#snippet control()}
              <select
                id="room-category-editor"
                bind:value={categoryDraft}
                disabled={savingField !== null}
              >
                <option value="">Untagged (classroom)</option>
                {#each ROOM_CATEGORIES as cat (cat)}
                  <option value={cat}>{ROOM_CATEGORY_LABELS[cat]}</option>
                {/each}
              </select>
            {/snippet}
          </EntityEditorField>

          <div class="editor-grid">
            <EntityEditorField
              label="Building"
              inputId="room-building-editor"
              {canPublish}
              disabled={savingField !== null}
              fieldSaving={savingField === "buildingId"}
              unchanged={buildingDraft ===
                String(currentRoom.value.buildingId ?? "")}
              onsave={() => saveField("buildingId")}
            >
              {#snippet control()}
                <select
                  id="room-building-editor"
                  bind:value={buildingDraft}
                  disabled={savingField !== null}
                >
                  <option value="">No building</option>
                  {#each buildings as building (building.id)}
                    <option value={String(building.id)}
                      >{building.buildingName}</option
                    >
                  {/each}
                </select>
              {/snippet}
            </EntityEditorField>

            <EntityEditorField
              label="College"
              inputId="room-college-editor"
              {canPublish}
              disabled={savingField !== null}
              fieldSaving={savingField === "collegeId"}
              unchanged={collegeDraft ===
                String(currentRoom.value.collegeId ?? "")}
              onsave={() => saveField("collegeId")}
            >
              {#snippet control()}
                <select
                  id="room-college-editor"
                  bind:value={collegeDraft}
                  disabled={savingField !== null}
                >
                  <option value="">No college</option>
                  {#each colleges as college (college.id)}
                    <option value={String(college.id)}
                      >{college.collegeName}</option
                    >
                  {/each}
                </select>
              {/snippet}
            </EntityEditorField>

            <EntityEditorField
              label="Division"
              inputId="room-division-editor"
              {canPublish}
              disabled={savingField !== null}
              fieldSaving={savingField === "divisionId"}
              unchanged={divisionDraft ===
                String(currentRoom.value.divisionId ?? "")}
              onsave={() => saveField("divisionId")}
            >
              {#snippet control()}
                <select
                  id="room-division-editor"
                  bind:value={divisionDraft}
                  disabled={savingField !== null}
                >
                  <option value="">No division</option>
                  {#each divisions as division (division.id)}
                    <option value={String(division.id)}
                      >{division.divisionName}</option
                    >
                  {/each}
                </select>
              {/snippet}
            </EntityEditorField>

            {#if adminAuthStore.isLoggedIn}
              <div class="editor-image-row">
                <ImageUpload
                  label="Room photo"
                  inputId="room-image-editor"
                  prefix="rooms"
                  bind:value={imageDraft}
                  disabled={savingField !== null}
                />
                <button
                  type="button"
                  class="field-save-btn"
                  disabled={savingField !== null ||
                    (imageDraft ?? null) ===
                      (currentRoom.value.imageUrl ?? null)}
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

          {#if mergePrompt}
            <div class="merge-prompt" role="status">
              <p>
                A room named <strong>{mergePrompt.candidate.code}</strong>
                already exists{#if mergePrompt.candidate.building?.name}
                  in {mergePrompt.candidate.building.name}{/if}. Merge
                <strong>{currentRoom.value.code}</strong> into it? Classes and map
                pins move to the kept room; empty fields are filled from the merged
                room.
              </p>
              <div class="merge-actions">
                <button
                  type="button"
                  class="merge-btn merge-btn-primary"
                  disabled={mergingRooms || savingField !== null}
                  onclick={confirmRoomMerge}
                >
                  {mergingRooms
                    ? "Merging..."
                    : `Merge into ${mergeCandidateLabel(mergePrompt.candidate)}`}
                </button>
                <button
                  type="button"
                  class="merge-btn"
                  disabled={mergingRooms}
                  onclick={dismissMergePrompt}
                >
                  Keep separate
                </button>
              </div>
            </div>
          {/if}
        </EntityEditorPanel>
      </section>
    {/if}

    {#if currentRoom.value.imageUrl}
      <img
        class="entity-image"
        src={currentRoom.value.imageUrl}
        alt={currentRoom.value.code}
        loading="lazy"
      />
    {/if}

    <section class="entity-directions" aria-label="Directions">
      <div class="entity-directions__segment">
        <p class="entity-directions__label">Room directions</p>
        {#if currentRoom.value.directions}
          <p class="entity-directions__text">{currentRoom.value.directions}</p>
        {:else}
          <p class="entity-directions__empty">
            No directions listed.
          </p>
        {/if}
      </div>

      {#if parentBuilding}
        <div class="entity-directions__segment">
          <p class="entity-directions__label">Building directions</p>
          {#if parentBuilding.directions}
            <p class="entity-directions__text">{parentBuilding.directions}</p>
          {:else}
            <p class="entity-directions__empty">No building directions.</p>
          {/if}
        </div>
      {/if}
    </section>

    {#if currentRoom.value}
      <EntityLastUpdated
        updatedAt={currentRoom.value.updatedAt}
        entityType="room"
        entityId={currentRoom.value.id}
      />
    {/if}

    <section
      class="entity-list-section entity-schedule"
      aria-label="Classes in this room"
    >
      <div class="entity-schedule__header">
        <h3 class="entity-section-heading">
          Classes in this room
          {#if !roomClassesStore.loading}
            <span class="entity-schedule__count"
              >({roomClassesStore.classes.length})</span
            >
          {/if}
        </h3>
        {#if roomClassesStore.classes.length > 0}
          <button
            type="button"
            class="entity-footer__link"
            onclick={() => modalStore.openModal("schedule-expand")}
          >
            Open schedule →
          </button>
        {/if}
      </div>
      <TermSelector />
      <p class="entity-schedule__scope">{ROOM_SCHEDULE_SCOPE_NOTE}</p>
      {#if roomClassesStore.loading}
        <p class="entity-schedule__empty">Loading classes…</p>
      {:else if roomClassesStore.classes.length > 0}
        <Classes
          classes={roomClassesStore.classes}
          currentRoomCode={currentRoom.value?.code ?? null}
        />
      {:else}
        <p class="entity-schedule__empty">
          No classes listed for this room{activeTermLabel
            ? ` in ${activeTermLabel}`
            : ""}.
        </p>
      {/if}
    </section>

    {#if finalExamsLoading || finalExams.length > 0}
      <section class="entity-schedule" aria-label="Final exams in this room">
        <div class="entity-schedule__header">
          <h3 class="entity-schedule__title">
            Final exams in this room
            {#if !finalExamsLoading}
              <span class="entity-schedule__count">({finalExams.length})</span>
            {/if}
          </h3>
        </div>
        {#if activeTermLabel}
          <p class="entity-schedule__term">{activeTermLabel}</p>
        {/if}
        <p class="entity-schedule__scope">{FINALS_SCOPE_NOTE}</p>
        {#if finalExamsLoading}
          <p class="entity-schedule__empty">Loading final exams…</p>
        {:else}
          <FinalExamsList exams={finalExams} />
        {/if}
      </section>
    {/if}
  {:else}
    <p>Room not found.</p>
  {/if}
</div>

<style>
  @import "../controls/entity-detail.css";
  @import "../editor/entity-editor.css";
  @import "../map-chrome/map-chrome.css";

  .room-category-badge {
    display: inline-block;
    align-self: flex-start;
    padding: 0.125rem 0.5rem;
    border-radius: 999px;
    background: hsl(5, 40%, 94%);
    color: #7b1113;
    font-size: 0.6875rem;
    font-weight: 600;
  }

  .merge-prompt {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.625rem;
    border: 1px solid hsl(35, 80%, 70%);
    border-radius: 0.5rem;
    background-color: hsl(45, 100%, 97%);
  }

  .merge-prompt p {
    margin: 0;
    font-size: 0.8125rem;
    line-height: 1.45;
    color: #333;
  }

  .merge-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .merge-btn {
    border: 1px solid #d8b9ba;
    border-radius: 0.375rem;
    padding: 0.375rem 0.625rem;
    background: white;
    color: #7b1113;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
  }

  .merge-btn-primary {
    border-color: hsl(5, 53%, 32%);
    background-color: hsl(5, 53%, 32%);
    color: white;
  }

  .merge-btn:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .entity-schedule {
    gap: 0.375rem;
  }

  .entity-schedule__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .entity-schedule__count {
    color: #71717a;
    font-weight: 600;
    letter-spacing: normal;
    text-transform: none;
  }

  .entity-schedule__term {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 600;
    color: #7b1113;
  }

  .entity-schedule__scope {
    margin: 0;
    font-size: 0.6875rem;
    line-height: 1.4;
    color: #71717a;
    background-color: #f4f4f5;
    padding: 0.375rem 0.5rem;
    border-radius: 0.25rem;
  }

  .entity-schedule__empty {
    margin: 0;
    font-size: 0.8125rem;
    color: #71717a;
  }
</style>
