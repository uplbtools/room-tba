<script lang="ts">
  import {
    adminAuthStore,
    queryStore,
    toastStore,
  } from "../../../lib/store.svelte";
  import { persistEntityChange } from "../../../lib/proposals/client";
  import { getAppActions, getAppData } from "../../../lib/context";
  import type { DivisionData, RoomData } from "../../../lib/types";
  import { getDivisionRooms } from "../../../lib/local/data/utils";
  import ResultDisplay from "./ResultDisplay.svelte";
  import {
    checkLocalDivisionRoom,
    syncDivisionRooms,
  } from "../../../lib/local/data/sync";
  import { onMount } from "svelte";

  type DivisionPatchResponse = {
    success?: boolean;
    division?: DivisionData;
    latest?: DivisionData | null;
    error?: string;
  };

  const appData = getAppData();
  const appActions = getAppActions();
  const { divisions, loaded } = $derived(appData());

  const division = $derived(
    loaded
      ? divisions.find((d) => d.divisionName === queryStore.queryValue)
      : null,
  );

  let divisionRooms = $state<RoomData[] | null>(null);
  let editing = $state(false);
  let draftDivisionId = $state<number | null>(null);
  let draftVersion = $state<number | null>(null);
  let nameDraft = $state("");
  let saving = $state(false);
  let saved = $state(false);
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
    saved = false;
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

  async function saveName() {
    const current = division;
    if (!current) return;

    const trimmedName = nameDraft.trim();
    if (trimmedName.length === 0) {
      fieldError = `${current.divisionName} name cannot be empty.`;
      return;
    }

    saving = true;
    saved = false;
    fieldError = null;

    try {
      const result = await persistEntityChange({
        entityType: "division",
        entityId: current.id,
        baseVersion: current.version,
        patch: { divisionName: trimmedName },
        entityLabel: current.divisionName,
        canPublish,
        submitterName:
          adminAuthStore.displayName ??
          adminAuthStore.username ??
          submitterNameDraft,
      });

      if (!result.ok) {
        if (result.latest)
          syncDivisionFromServer(result.latest as DivisionData);
        fieldError =
          result.error ?? `${current.divisionName} could not be saved.`;
        return;
      }

      if (result.published) {
        syncDivisionFromServer(result.published as DivisionData);
      } else {
        toastStore.show(
          "Division name suggestion submitted for review.",
          "success",
        );
      }
      saved = true;
      setTimeout(() => {
        saved = false;
      }, 1800);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Network error";
      fieldError = `${current.divisionName} failed to save: ${reason}`;
    } finally {
      saving = false;
    }
  }
</script>

<div class="division-query-wrapper">
  {#if division}
    <div class="division-header">
      <h2 class="division-title">{division.divisionName}</h2>
    </div>

    <section class="entity-editor" aria-label="Edit division details">
      <button
        type="button"
        class="editor-toggle"
        aria-expanded={editing}
        onclick={() => (editing = !editing)}
      >
        {editing ? "Close" : canPublish ? "Edit division" : "Suggest an edit"}
      </button>
      {#if editing}
        <div class="editor-heading">
          <span>{canPublish ? "Editor" : "Suggest a change"}</span>
        </div>
        {#if !canPublish && !adminAuthStore.isAdmin}
          <div class="editor-field">
            <label for="division-submitter-name">Your name</label>
            <input
              id="division-submitter-name"
              bind:value={submitterNameDraft}
              maxlength="100"
              autocomplete="name"
            />
          </div>
        {/if}
        <div class="editor-field">
          <label for="division-name-editor">Division name</label>
          <div class="editor-control-row">
            <input
              id="division-name-editor"
              bind:value={nameDraft}
              disabled={saving}
              autocomplete="off"
            />
            <button
              class="field-save-btn"
              disabled={saving || nameDraft.trim() === division.divisionName}
              onclick={saveName}
            >
              {saving
                ? canPublish
                  ? "Saving..."
                  : "Submitting..."
                : canPublish
                  ? "Save"
                  : "Submit"}
            </button>
          </div>
        </div>
        {#if saved}
          <p class="editor-message success">Division name saved.</p>
        {/if}
        {#if fieldError}
          <p class="editor-message error">{fieldError}</p>
        {/if}
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

  .entity-editor {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.625rem;
    border: 1px solid hsl(5, 53%, 88%);
    border-radius: 0.625rem;
    background-color: hsl(5, 53%, 98%);
  }

  .editor-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: max-content;
    border: 1px solid #d8b9ba;
    border-radius: 0.5rem;
    background: white;
    color: #7b1113;
    cursor: pointer;
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 700;
    padding: 0.45rem 0.75rem;
  }

  .editor-toggle:hover,
  .editor-toggle:focus-visible {
    background: #fdf3f3;
  }

  .editor-toggle:focus-visible {
    outline: 2px solid #7b1113;
    outline-offset: 2px;
  }

  .editor-heading {
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

  .editor-control-row input {
    min-width: 0;
    flex: 1;
    border: 1px solid #d8d8d8;
    border-radius: 0.5rem;
    padding: 0.45rem 0.55rem;
    font: inherit;
    font-size: 0.8125rem;
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

  .field-save-btn:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .editor-message {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .editor-message.success {
    color: hsl(160, 84%, 26%);
  }

  .editor-message.error {
    color: hsl(0, 70%, 38%);
  }
</style>
