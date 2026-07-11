<script lang="ts">
  import LoadingIndicator from "@ui/LoadingIndicator.svelte";
  import {
    adminAuthStore,
    queryStore,
    toastStore,
    termStore,
  } from "@lib/store.svelte";
  import {
    getStoredProposalForEntity,
    persistEntityChange,
    mergeEntityRecord,
  } from "@lib/proposals/client";
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
  import EntityShareCopyLink from "./EntityShareCopyLink.svelte";
  import EntityExternalLink from "./EntityExternalLink.svelte";
  import EntityLastUpdated from "../EntityLastUpdated.svelte";
  import { getCollegeShareUrl } from "@lib/share-links";
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
  let activeProposalId = $state<number | null>(null);
  let proposalStatus = $state<string | null>(null);
  let mergePrompt = $state<{
    candidate: CollegeData;
    attemptedName: string;
    sourceVersion: number;
  } | null>(null);
  let mergingEntity = $state(false);
  const canPublish = $derived(adminAuthStore.canPublish);
  const collegeShareUrl = $derived(
    college ? getCollegeShareUrl(college.collegeName) : "",
  );

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
    proposalStatus = null;
    const stored = getStoredProposalForEntity("college", current.id);
    activeProposalId = stored?.id ?? null;
    if (stored) proposalStatus = stored.status;

    if (!canPublish) {
      const savedDraft = readEntityContributorDraft("college", current.id);
      if (savedDraft) {
        // if (savedDraft.editing) editing = true;
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
    appActions.upsertCollege(updated);
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
        proposalId: activeProposalId,
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

      if (outcome.proposal) {
        activeProposalId = outcome.proposal.id;
        proposalStatus = outcome.proposal.status;
        clearEntityContributorDraft("college", current.id);
        toastStore.show(
          "College name suggestion submitted for review.",
          "success",
        );
      }
      if (outcome.published) {
        saved = true;
        setTimeout(() => {
          saved = false;
        }, 1800);
      }
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
  const allFieldsUnchanged = $derived.by(() => {
    return nameDraft.trim() === (college?.collegeName ?? "");
  });
</script>

<div class="entity-detail college-query-wrapper">
  {#if college}
    <header class="entity-header">
      <h2 class="entity-header__title">{college.collegeName}</h2>
      <div class="entity-actions">
        <EntityShareCopyLink
          url={collegeShareUrl}
          entityLabel={college.collegeName}
        />
        <EntityEditorToggle
          expanded={editing}
          {canPublish}
          publishOpenLabel="Edit college"
          variant="toolbar"
          onclick={() => (editing = !editing)}
        />
      </div>
    </header>

    {#if college.websiteLink}
      <div class="entity-dorm-details__links">
        <EntityExternalLink
          href={college.websiteLink}
          label="Website"
          ariaLabel={`Open ${college.collegeName} website (opens in new tab)`}
        />
      </div>
    {/if}

    <EntityLastUpdated
      updatedAt={college.updatedAt}
      entityType="college"
      entityId={college.id}
    />

    {#if editing}
      <section class="entity-editor" aria-label="Edit college details">
        <EntityEditorPanel
          {canPublish}
          showSubmitterName={!canPublish && !adminAuthStore.isLoggedIn}
          submitterNameId="college-submitter-name"
          historyEntity={college ? { entityType: "college", entityId: college.id, version: college.version } : null}
          bind:submitterName={submitterNameDraft}
          {proposalStatus}
          {activeProposalId}
          onWithdrawn={() => {
            activeProposalId = null;
            proposalStatus = null;
          }}
          onsubmit={saveName}
          submitting={saving}
          submitDisabled={allFieldsUnchanged}
          successMessage={saved
            ? entityEditorSavedMessage({
                canPublish,
                savedFieldLabel: "Name",
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
      </section>
    {/if}

    <section class="entity-list-section" aria-label="College divisions">
      <h3 class="entity-section-heading">Divisions</h3>
      {#if collegeDivisions.length > 0}
        <ul class="entity-nav-list">
          {#each collegeDivisions as item (item.id)}
            <li>
              <button
                type="button"
                class="entity-nav-chip"
                onclick={() => openDivision(item.divisionName)}
              >
                {item.divisionName}
              </button>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="entity-nav-empty">
          No divisions assigned yet. Open a division and set its parent college
          in the editor.
        </p>
      {/if}
    </section>
  {/if}
  {#if collegeRooms}
    <ResultDisplay
      filteredRooms={collegeRooms}
      {classCounts}
      sectionTitle="Rooms under this college"
      emptyMessage="No rooms found for this college."
      groupByBuilding
    />
  {:else if college}
    <LoadingIndicator block label="Loading rooms for {college.collegeName}…" />
  {/if}
</div>

<style>
  @import "./entity-detail.css";
  @import "../editor/entity-editor.css";

  .college-query-wrapper {
    width: 100%;
    flex: 1 1 0;
    overflow-y: auto;
  }
</style>
