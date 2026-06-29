<script lang="ts">
  import {
    adminAuthStore,
    queryStore,
    toastStore,
    termStore,
  } from "@lib/store.svelte";
  import { persistEntityChange, mergeEntityRecord } from "@lib/proposals/client";
  import { handlePersistEntityResult } from "@lib/editor/handle-persist-result";
  import MergeEntityPrompt from "@ui/editor/MergeEntityPrompt.svelte";
  import {
    clearEntityContributorDraft,
    readEntityContributorDraft,
    scheduleEntityContributorDraftSave,
  } from "@lib/contributor-drafts";
  import { getAppActions, getAppData } from "@lib/context";
  import { getCollegeRooms, fetchRoomClassCounts } from "@lib/local/data/utils";
  import type { CollegeData, RoomData } from "@lib/types";
  import ResultDisplay from "./ResultDisplay.svelte";
  import EntityEditorToggle from "@ui/editor/EntityEditorToggle.svelte";
  import EntityEditorPanel from "@ui/editor/EntityEditorPanel.svelte";
  import EntityEditorField from "@ui/editor/EntityEditorField.svelte";
  import { entityEditorSavedMessage } from "@lib/editor/field-action-label";
  import {
    checkLocalCollegeRoom,
    syncCollegeRooms,
  } from "@lib/local/data/sync";

  type CollegePatchResponse = {
    success?: boolean;
    college?: CollegeData;
    latest?: CollegeData | null;
    error?: string;
  };

  const appData = getAppData();
  const appActions = getAppActions();
  const { divisions, colleges, loaded } = $derived(appData());

  const college = $derived(
    loaded
      ? colleges.find((c) => c.collegeName === queryStore.queryValue)
      : null,
  );

  const collegeDivisions = $derived.by(() => {
    const current = college;
    if (!current || !loaded) return [];
    return divisions
      .filter((item) => item.collegeId === current.id)
      .sort((a, b) => a.divisionName.localeCompare(b.divisionName));
  });

  let collegeRooms = $state<RoomData[] | null>(null);
  let classCounts = $state<Map<number, number> | null>(null);
  let editing = $state(false);
  let draftCollegeId = $state<number | null>(null);
  let draftVersion = $state<number | null>(null);
  let nameDraft = $state("");
  let saving = $state(false);
  let saved = $state(false);
  let fieldError = $state<string | null>(null);
  let submitterNameDraft = $state("");
  let mergePrompt = $state<{
    candidate: CollegeData;
    attemptedName: string;
    sourceVersion: number;
  } | null>(null);
  let mergingEntity = $state(false);
  const canPublish = $derived(adminAuthStore.canPublish);

  // Reload rooms when the selected college changes; CollegeResult is not
  // remounted on switch, so key the load on college id and discard stale
  // fetches from a previous selection (#340).
  let roomLoadGeneration = 0;

  $effect(() => {
    const id = college?.id;
    if (id == null) {
      collegeRooms = null;
      return;
    }
    const gen = ++roomLoadGeneration;
    collegeRooms = null;
    void (async () => {
      const collegeChecker = await checkLocalCollegeRoom(id);
      const rooms = await getCollegeRooms(collegeChecker, id);
      if (gen !== roomLoadGeneration) return;
      collegeRooms = rooms;
      await syncCollegeRooms(collegeChecker, id, rooms);
    })();
  });

  // Class counts per room for the active term, batched in one request so the
  // room list preview doesn't fire N+1 /api/classes calls (#342). Re-fetches
  // when the college or the active term changes; null while loading/offline.
  let classCountGeneration = 0;

  $effect(() => {
    const id = college?.id;
    const termId = termStore.activeTermId;
    if (id == null) {
      classCounts = null;
      return;
    }
    const gen = ++classCountGeneration;
    void (async () => {
      const counts = await fetchRoomClassCounts(
        "college",
        id,
        termId ?? undefined,
      );
      if (gen !== classCountGeneration) return;
      classCounts = counts;
    })();
  });

  $effect(() => {
    const current = college;
    if (!current) return;
    if (draftCollegeId === current.id && draftVersion === current.version) {
      return;
    }

    draftCollegeId = current.id;
    draftVersion = current.version;
    nameDraft = current.collegeName;
    saved = false;
    fieldError = null;
    mergePrompt = null;

    if (!canPublish) {
      const savedDraft = readEntityContributorDraft("college", current.id);
      if (savedDraft) {
        if (savedDraft.editing) editing = true;
        if (typeof savedDraft.fields.nameDraft === "string") {
          nameDraft = savedDraft.fields.nameDraft;
        }
      }
    }
  });

  $effect(() => {
    if (canPublish || !editing || !college) return;
    scheduleEntityContributorDraftSave("college", college.id, () => ({
      editing: true,
      fields: { nameDraft },
    }));
  });

  function syncCollegeFromServer(updated: CollegeData) {
    appActions.replaceCollege(updated);
    queryStore.hydrateQuery({
      type: "result",
      category: "college",
      value: updated.collegeName,
    });
  }

  async function saveName() {
    const current = college;
    if (!current) return;

    const trimmedName = nameDraft.trim();
    if (trimmedName.length === 0) {
      fieldError = `${current.collegeName} name cannot be empty.`;
      return;
    }

    saving = true;
    saved = false;
    fieldError = null;

    try {
      const result = await persistEntityChange({
        entityType: "college",
        entityId: current.id,
        baseVersion: current.version,
        patch: { collegeName: trimmedName },
        entityLabel: current.collegeName,
        canPublish,
        submitterName:
          adminAuthStore.displayName ??
          adminAuthStore.username ??
          submitterNameDraft,
      });

      const outcome = handlePersistEntityResult<CollegeData>(result, {
        syncFromServer: syncCollegeFromServer,
        fallbackError: `${current.collegeName} could not be saved.`,
      });

      if (outcome.error) {
        if (outcome.mergeCandidate) {
          mergePrompt = {
            candidate: outcome.mergeCandidate as CollegeData,
            attemptedName: trimmedName,
            sourceVersion: current.version,
          };
          fieldError = null;
          return;
        }
        fieldError = outcome.error;
        return;
      }

      if (!outcome.published) {
        clearEntityContributorDraft("college", current.id);
        toastStore.show(
          "College name suggestion submitted for review.",
          "success",
        );
      }
      saved = true;
      setTimeout(() => {
        saved = false;
      }, 1800);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Network error";
      fieldError = `${current.collegeName} failed to save: ${reason}`;
    } finally {
      saving = false;
    }
  }

  function dismissMergePrompt() {
    mergePrompt = null;
    const current = college;
    if (current) nameDraft = current.collegeName;
  }

  async function confirmCollegeMerge() {
    const current = college;
    if (!current || !mergePrompt) return;

    mergingEntity = true;
    fieldError = null;

    try {
      const result = await mergeEntityRecord({
        entityType: "college",
        sourceId: current.id,
        targetId: mergePrompt.candidate.id,
        sourceVersion: mergePrompt.sourceVersion,
        preferredName: mergePrompt.attemptedName,
      });

      if (!result.ok) {
        if (result.latest) syncCollegeFromServer(result.latest as CollegeData);
        fieldError =
          result.error ??
          `${current.collegeName} could not be merged into ${mergePrompt.candidate.collegeName}.`;
        return;
      }

      if (result.entity) {
        syncCollegeFromServer(result.entity as CollegeData);
        toastStore.show(
          `Merged ${current.collegeName} into ${mergePrompt.candidate.collegeName}.`,
          "success",
        );
      }
      mergePrompt = null;
      editing = false;
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Network error";
      fieldError = `${current.collegeName} merge failed: ${reason}`;
    } finally {
      mergingEntity = false;
    }
  }

  function openDivision(divisionName: string) {
    queryStore.updateQuery({
      type: "result",
      category: "division",
      value: divisionName,
    });
  }
</script>

<div class="college-query-wrapper">
  {#if college}
    <div class="college-header">
      <h2 class="college-title">{college.collegeName}</h2>
    </div>

    <section class="entity-editor" aria-label="Edit college details">
      <EntityEditorToggle
        expanded={editing}
        {canPublish}
        publishOpenLabel="Edit college"
        onclick={() => (editing = !editing)}
      />
      {#if editing}
        <EntityEditorPanel
          {canPublish}
          showSubmitterName={!canPublish && !adminAuthStore.isLoggedIn}
          submitterNameId="college-submitter-name"
          bind:submitterName={submitterNameDraft}
          successMessage={saved
            ? entityEditorSavedMessage({
                canPublish,
                savedFieldLabel: "College name",
              })
            : null}
          errorMessage={fieldError}
        >
          <EntityEditorField
            label="College name"
            inputId="college-name-editor"
            {canPublish}
            disabled={saving}
            fieldSaving={saving}
            unchanged={nameDraft.trim() === college.collegeName}
            onsave={saveName}
          >
            {#snippet control()}
              <input
                id="college-name-editor"
                bind:value={nameDraft}
                disabled={saving}
                autocomplete="off"
              />
            {/snippet}
          </EntityEditorField>

          {#if mergePrompt}
            <MergeEntityPrompt
              entityKind="college"
              sourceLabel={college.collegeName}
              candidateLabel={mergePrompt.candidate.collegeName}
              detail="Merge divisions and room links into the kept college;"
              merging={mergingEntity}
              disabled={saving}
              onconfirm={confirmCollegeMerge}
              ondismiss={dismissMergePrompt}
            />
          {/if}
        </EntityEditorPanel>
      {/if}
    </section>

    <section class="taxonomy-section" aria-label="College divisions">
      <h3 class="taxonomy-heading">Divisions in this college</h3>
      {#if collegeDivisions.length > 0}
        <ul class="taxonomy-list">
          {#each collegeDivisions as item (item.id)}
            <li>
              <button
                type="button"
                class="taxonomy-link"
                onclick={() => openDivision(item.divisionName)}
              >
                {item.divisionName}
              </button>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="taxonomy-empty">
          No divisions assigned yet. Open a division and set its parent college
          in the editor.
        </p>
      {/if}
    </section>
  {/if}
  {#if collegeRooms}
    <ResultDisplay filteredRooms={collegeRooms} {classCounts} />
  {:else if college}
    <p class="entity-loading-note">
      Loading rooms for {college.collegeName}…
    </p>
  {/if}
</div>

<style>
  @import "../editor/entity-editor.css";

  .college-query-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
    flex: 1 1 0;
    overflow-y: auto;
  }

  .college-header {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    width: 100%;
    flex-shrink: 0;
  }

  .college-title {
    font-size: 1.125rem;
    font-weight: bold;
    color: black;
    margin: 0;
    line-height: 1.25rem;
  }

  .taxonomy-section {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .taxonomy-heading {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: black;
  }

  .taxonomy-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .taxonomy-link {
    all: unset;
    display: block;
    max-width: 100%;
    padding: 0.375rem 0.5rem;
    border: 1px solid hsl(5, 53%, 88%);
    border-radius: 0.5rem;
    background: white;
    color: hsl(5, 53%, 32%);
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .taxonomy-link:hover,
  .taxonomy-link:focus-visible {
    background: hsl(5, 53%, 98%);
  }

  .taxonomy-empty {
    margin: 0;
    font-size: 0.8125rem;
    line-height: 1.45;
    color: hsl(0, 0%, 40%);
  }
</style>
