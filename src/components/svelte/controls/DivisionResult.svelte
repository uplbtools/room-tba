<script lang="ts">
  import {
    adminAuthStore,
    queryStore,
    toastStore,
  } from "@lib/store.svelte";
  import { persistEntityChange } from "@lib/proposals/client";
  import { handlePersistEntityResult } from "@lib/editor/handle-persist-result";
  import { getAppActions, getAppData } from "@lib/context";
  import type { DivisionData, RoomData } from "@lib/types";
  import { getDivisionRooms } from "@lib/local/data/utils";
  import ResultDisplay from "./ResultDisplay.svelte";
  import EntityEditorToggle from "@ui/editor/EntityEditorToggle.svelte";
  import EntityEditorPanel from "@ui/editor/EntityEditorPanel.svelte";
  import EntityEditorField from "@ui/editor/EntityEditorField.svelte";
  import { entityEditorSavedMessage } from "@lib/editor/field-action-label";
  import {
    checkLocalDivisionRoom,
    syncDivisionRooms,
  } from "@lib/local/data/sync";
  import { onMount } from "svelte";

  type DivisionPatchResponse = {
    success?: boolean;
    division?: DivisionData;
    latest?: DivisionData | null;
    error?: string;
  };

  const appData = getAppData();
  const appActions = getAppActions();
  const { divisions, colleges, loaded } = $derived(appData());

  const division = $derived(
    loaded
      ? divisions.find((d) => d.divisionName === queryStore.queryValue)
      : null,
  );

  const parentCollege = $derived.by(() => {
    const current = division;
    if (!current?.collegeId) return null;
    return colleges.find((college) => college.id === current.collegeId) ?? null;
  });

  let divisionRooms = $state<RoomData[] | null>(null);
  let editing = $state(false);
  let draftDivisionId = $state<number | null>(null);
  let draftVersion = $state<number | null>(null);
  let nameDraft = $state("");
  let collegeDraft = $state("");
  let savingField = $state<"divisionName" | "collegeId" | null>(null);
  let savedField = $state<"divisionName" | "collegeId" | null>(null);
  let fieldError = $state<string | null>(null);
  let submitterNameDraft = $state("");
  const canPublish = $derived(adminAuthStore.canPublish);

  onMount(async () => {
    if (!division) return;
    const divisionChecker = await checkLocalDivisionRoom(division.id);
    divisionRooms = await getDivisionRooms(divisionChecker, division.id);
    await syncDivisionRooms(divisionChecker, division.id, divisionRooms);
  });

  $effect(() => {
    const current = division;
    if (!current) return;
    if (draftDivisionId === current.id && draftVersion === current.version) {
      return;
    }

    draftDivisionId = current.id;
    draftVersion = current.version;
    nameDraft = current.divisionName;
    collegeDraft = current.collegeId === null ? "" : String(current.collegeId);
    savedField = null;
    fieldError = null;
  });

  function syncDivisionFromServer(updated: DivisionData) {
    appActions.replaceDivision(updated);
    queryStore.hydrateQuery({
      type: "result",
      category: "division",
      value: updated.divisionName,
    });
  }

  async function saveField(field: "divisionName" | "collegeId") {
    const current = division;
    if (!current) return;

    const patch: {
      version: number;
      divisionName?: string;
      collegeId?: number | null;
    } = { version: current.version };

    if (field === "divisionName") {
      const trimmedName = nameDraft.trim();
      if (trimmedName.length === 0) {
        fieldError = `${current.divisionName} name cannot be empty.`;
        return;
      }
      patch.divisionName = trimmedName;
    } else {
      patch.collegeId = collegeDraft === "" ? null : Number(collegeDraft);
    }

    savingField = field;
    savedField = null;
    fieldError = null;

    try {
      const { version, ...bodyPatch } = patch;
      const result = await persistEntityChange({
        entityType: "division",
        entityId: current.id,
        baseVersion: current.version,
        patch: bodyPatch,
        entityLabel: current.divisionName,
        canPublish,
        submitterName:
          adminAuthStore.displayName ??
          adminAuthStore.username ??
          submitterNameDraft,
      });

      const outcome = handlePersistEntityResult<DivisionData>(result, {
        syncFromServer: syncDivisionFromServer,
        fallbackError: `${current.divisionName} could not be saved.`,
      });

      if (outcome.error) {
        fieldError = outcome.error;
        return;
      }

      if (!outcome.published) {
        toastStore.show(
          "Division change suggestion submitted for review.",
          "success",
        );
      }
      savedField = field;
      setTimeout(() => {
        if (savedField === field) savedField = null;
      }, 1800);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Network error";
      fieldError = `${current.divisionName} failed to save: ${reason}`;
    } finally {
      savingField = null;
    }
  }

  function openCollege(collegeName: string) {
    queryStore.updateQuery({
      type: "result",
      category: "college",
      value: collegeName,
    });
  }

  function divisionSavedMessage(
    field: "divisionName" | "collegeId" | null,
  ): string | null {
    if (!field) return null;
    if (!canPublish) {
      return entityEditorSavedMessage({ canPublish: false });
    }
    return field === "collegeId"
      ? "Parent college saved."
      : "Division name saved.";
  }
</script>

<div class="division-query-wrapper">
  {#if division}
    <div class="division-header">
      <h2 class="division-title">{division.divisionName}</h2>
      {#if parentCollege}
        <p class="division-subtitle">
          Part of
          <button
            type="button"
            class="college-link"
            onclick={() => openCollege(parentCollege.collegeName)}
          >
            {parentCollege.collegeName}
          </button>
        </p>
      {:else}
        <p class="division-subtitle unassigned">No parent college assigned</p>
      {/if}
    </div>

    <section class="entity-editor" aria-label="Edit division details">
      <EntityEditorToggle
        expanded={editing}
        {canPublish}
        publishOpenLabel="Edit division"
        onclick={() => (editing = !editing)}
      />
      {#if editing}
        <EntityEditorPanel
          {canPublish}
          showSubmitterName={!canPublish && !adminAuthStore.isLoggedIn}
          submitterNameId="division-submitter-name"
          bind:submitterName={submitterNameDraft}
          successMessage={divisionSavedMessage(savedField)}
          errorMessage={fieldError}
        >
          <EntityEditorField
            label="Division name"
            inputId="division-name-editor"
            {canPublish}
            disabled={savingField !== null}
            fieldSaving={savingField === "divisionName"}
            unchanged={nameDraft.trim() === division.divisionName}
            onsave={() => saveField("divisionName")}
          >
            {#snippet control()}
              <input
                id="division-name-editor"
                bind:value={nameDraft}
                disabled={savingField !== null}
                autocomplete="off"
              />
            {/snippet}
          </EntityEditorField>
          <EntityEditorField
            label="Parent college"
            inputId="division-college-editor"
            {canPublish}
            disabled={savingField !== null}
            fieldSaving={savingField === "collegeId"}
            unchanged={collegeDraft === String(division.collegeId ?? "")}
            onsave={() => saveField("collegeId")}
          >
            {#snippet control()}
              <select
                id="division-college-editor"
                bind:value={collegeDraft}
                disabled={savingField !== null}
              >
                <option value="">No college</option>
                {#each colleges as college (college.id)}
                  <option value={String(college.id)}>{college.collegeName}</option
                  >
                {/each}
              </select>
            {/snippet}
          </EntityEditorField>
        </EntityEditorPanel>
      {/if}
    </section>
  {/if}
  {#if divisionRooms}
    <ResultDisplay filteredRooms={divisionRooms} />
  {:else}
    Loading data...
  {/if}
</div>

<style>
  @import "../editor/entity-editor.css";

  .division-query-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
    flex: 1 1 0;
    overflow-y: auto;
  }

  .division-header {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    width: 100%;
    flex-shrink: 0;
  }

  .division-title {
    font-size: 1.125rem;
    font-weight: bold;
    color: black;
    margin: 0;
    line-height: 1.25rem;
  }

  .division-subtitle {
    margin: 0;
    font-size: 0.8125rem;
    color: hsl(0, 0%, 40%);
  }

  .division-subtitle.unassigned {
    color: hsl(0, 0%, 55%);
  }

  .college-link {
    all: unset;
    cursor: pointer;
    color: hsl(5, 53%, 32%);
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .college-link:hover,
  .college-link:focus-visible {
    color: hsl(5, 53%, 22%);
  }
</style>
