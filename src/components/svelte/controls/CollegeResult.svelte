<script lang="ts">
  import { adminAuthStore, queryStore, toastStore } from "@lib/store.svelte";
  import ResultDisplay from "./ResultDisplay.svelte";
  import {
    checkLocalCollegeRoom,
    syncCollegeRooms,
  } from "@lib/local/data/sync";
  import { onMount } from "svelte";

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
  let editing = $state(false);
  let draftCollegeId = $state<number | null>(null);
  let draftVersion = $state<number | null>(null);
  let nameDraft = $state("");
  let saving = $state(false);
  let saved = $state(false);
  let fieldError = $state<string | null>(null);
  let submitterNameDraft = $state("");
  const canPublish = $derived(adminAuthStore.canPublish);

  onMount(async () => {
    if (!college) return;
    const collegeChecker = await checkLocalCollegeRoom(college.id);
    collegeRooms = await getCollegeRooms(collegeChecker, college.id);
    await syncCollegeRooms(collegeChecker, college.id, collegeRooms);
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

      if (!result.ok) {
        if (result.latest) syncCollegeFromServer(result.latest as CollegeData);
        fieldError =
          result.error ?? `${current.collegeName} could not be saved.`;
        return;
      }

      if (result.published) {
        syncCollegeFromServer(result.published as CollegeData);
      } else {
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
      <button
        type="button"
        class="editor-toggle"
        aria-expanded={editing}
        onclick={() => (editing = !editing)}
      >
        {editing ? "Close" : canPublish ? "Edit college" : "Suggest an edit"}
      </button>
      {#if editing}
        <div class="editor-heading">
          <span>{canPublish ? "Editor" : "Suggest a change"}</span>
        </div>
        {#if !canPublish && !adminAuthStore.isLoggedIn}
          <div class="editor-field">
            <label for="college-submitter-name">Your name</label>
            <input
              id="college-submitter-name"
              bind:value={submitterNameDraft}
              maxlength="100"
              autocomplete="name"
            />
          </div>
        {/if}
        <div class="editor-field">
          <label for="college-name-editor">College name</label>
          <div class="editor-control-row">
            <input
              id="college-name-editor"
              bind:value={nameDraft}
              disabled={saving}
              autocomplete="off"
            />
            <button
              class="field-save-btn"
              disabled={saving || nameDraft.trim() === college.collegeName}
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
          <p class="editor-message success">College name saved.</p>
        {/if}
        {#if fieldError}
          <p class="editor-message error">{fieldError}</p>
        {/if}
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
    <ResultDisplay filteredRooms={collegeRooms} />
  {:else}
    Loading data...
  {/if}
</div>

<style>
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
