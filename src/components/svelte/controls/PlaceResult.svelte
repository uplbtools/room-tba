<script lang="ts">
  import { queryStore, toastStore } from "@lib/store.svelte";
  import { getAppActions, getAppData } from "@lib/context";
  import { persistEntityChange } from "@lib/proposals/client";
  import { adminAuthStore } from "@lib/stores/admin-auth.svelte";
  import {
    PLACE_CATEGORIES,
    PLACE_CATEGORY_LABELS,
    placeCategoryLabel,
  } from "@constants/place-categories";
  import type { PlaceData } from "@lib/types";

  const appData = getAppData();
  const appActions = getAppActions();
  const app = $derived(appData());
  const place = $derived(
    app.loaded
      ? (app.places.find((p) => p.name === queryStore.queryValue) ?? null)
      : null,
  );
  const canPublish = $derived(adminAuthStore.canPublish);

  const mapsUrl = $derived(
    place?.lat != null && place?.lon != null
      ? `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lon}`
      : null,
  );

  let editing = $state(false);
  let submitting = $state(false);
  let nameDraft = $state("");
  let categoryDraft = $state("");
  let descriptionDraft = $state("");
  let hoursDraft = $state("");
  let websiteDraft = $state("");
  let facebookDraft = $state("");
  let submitterName = $state("");

  function startEdit() {
    if (!place) return;
    nameDraft = place.name;
    categoryDraft = place.category;
    descriptionDraft = place.description ?? "";
    hoursDraft = place.hours ?? "";
    websiteDraft = place.websiteLink ?? "";
    facebookDraft = place.facebookLink ?? "";
    editing = true;
  }

  async function submit() {
    const current = place;
    if (!current || submitting) return;

    const patch: Record<string, unknown> = {};
    if (nameDraft.trim() && nameDraft.trim() !== current.name)
      patch.name = nameDraft.trim();
    if (categoryDraft && categoryDraft !== current.category)
      patch.category = categoryDraft;
    if (descriptionDraft.trim() !== (current.description ?? ""))
      patch.description = descriptionDraft.trim() || null;
    if (hoursDraft.trim() !== (current.hours ?? ""))
      patch.hours = hoursDraft.trim() || null;
    if (websiteDraft.trim() !== (current.websiteLink ?? ""))
      patch.websiteLink = websiteDraft.trim() || null;
    if (facebookDraft.trim() !== (current.facebookLink ?? ""))
      patch.facebookLink = facebookDraft.trim() || null;

    if (Object.keys(patch).length === 0) {
      editing = false;
      return;
    }

    submitting = true;
    try {
      const result = await persistEntityChange({
        entityType: "place",
        entityId: current.id,
        baseVersion: current.version,
        patch,
        entityLabel: current.name,
        canPublish,
        submitterName:
          adminAuthStore.displayName ??
          adminAuthStore.username ??
          submitterName,
      });
      if (result.ok) {
        if (result.published) {
          appActions.upsertPlace(result.published as PlaceData);
          toastStore.show(`${current.name} updated.`, "success");
        } else {
          toastStore.show(
            `Suggestion for ${current.name} submitted for review.`,
            "success",
          );
        }
        editing = false;
      } else {
        toastStore.show(result.error ?? "Could not save changes.", "error");
      }
    } catch {
      toastStore.show("Could not save changes.", "error");
    } finally {
      submitting = false;
    }
  }
</script>

{#if place}
  <div class="entity-detail">
    <header class="entity-header">
      <h2 class="entity-header__title">{place.name}</h2>
      {#if placeCategoryLabel(place.category)}
        <span class="place-category-badge"
          >{placeCategoryLabel(place.category)}</span
        >
      {/if}
    </header>

    {#if !editing}
      {#if place.description}
        <p class="place-description">{place.description}</p>
      {/if}
      <ul class="place-facts">
        {#if place.hours}
          <li><strong>Hours:</strong> {place.hours}</li>
        {/if}
        {#if mapsUrl}
          <li>
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
              >Open in Google Maps</a
            >
          </li>
        {/if}
        {#if place.websiteLink}
          <li>
            <a
              href={place.websiteLink}
              target="_blank"
              rel="noopener noreferrer">Website</a
            >
          </li>
        {/if}
        {#if place.facebookLink}
          <li>
            <a
              href={place.facebookLink}
              target="_blank"
              rel="noopener noreferrer">Facebook</a
            >
          </li>
        {/if}
      </ul>
      <button type="button" class="place-edit-btn" onclick={startEdit}>
        {canPublish ? "Edit place" : "Suggest an edit"}
      </button>
    {:else}
      <div class="place-form">
        <label>Name<input bind:value={nameDraft} /></label>
        <label
          >Category
          <select bind:value={categoryDraft}>
            {#each PLACE_CATEGORIES as cat (cat)}
              <option value={cat}>{PLACE_CATEGORY_LABELS[cat]}</option>
            {/each}
          </select>
        </label>
        <label
          >Description<textarea bind:value={descriptionDraft} rows="2"
          ></textarea></label
        >
        <label>Hours<input bind:value={hoursDraft} /></label>
        <label>Website<input bind:value={websiteDraft} /></label>
        <label>Facebook<input bind:value={facebookDraft} /></label>
        {#if !canPublish}
          <label>Your name (optional)<input bind:value={submitterName} /></label
          >
        {/if}
        <div class="place-form__actions">
          <button
            type="button"
            class="place-edit-btn"
            disabled={submitting}
            onclick={submit}
          >
            {canPublish ? "Save" : "Submit for review"}
          </button>
          <button
            type="button"
            class="place-cancel-btn"
            disabled={submitting}
            onclick={() => (editing = false)}
          >
            Cancel
          </button>
        </div>
      </div>
    {/if}
  </div>
{:else}
  <p class="place-empty">Select a place on the map to see details.</p>
{/if}

<style>
  @import "./entity-detail.css";

  .place-category-badge {
    display: inline-block;
    align-self: flex-start;
    padding: 0.125rem 0.5rem;
    border-radius: 999px;
    background: hsl(162, 45%, 92%);
    color: #0d7a5f;
    font-size: 0.6875rem;
    font-weight: 600;
  }
  .place-description {
    margin: 0.5rem 0;
    line-height: 1.4;
  }
  .place-facts {
    list-style: none;
    padding: 0;
    margin: 0.5rem 0 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }
  .place-form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .place-form label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.8125rem;
    font-weight: 600;
  }
  .place-form input,
  .place-form select,
  .place-form textarea {
    font: inherit;
    padding: 0.375rem 0.5rem;
    border: 1px solid hsl(0, 0%, 80%);
    border-radius: 0.375rem;
  }
  .place-form__actions {
    display: flex;
    gap: 0.5rem;
  }
  .place-edit-btn {
    padding: 0.375rem 0.75rem;
    border: none;
    border-radius: 0.375rem;
    background: #0d7a5f;
    color: white;
    font-weight: 600;
    cursor: pointer;
  }
  .place-edit-btn:hover:not(:disabled) {
    background: #0b6851;
  }
  .place-cancel-btn {
    padding: 0.375rem 0.75rem;
    border: 1px solid hsl(0, 0%, 80%);
    border-radius: 0.375rem;
    background: white;
    cursor: pointer;
  }
  .place-cancel-btn:hover:not(:disabled) {
    border-color: #c58f91;
    background: #fdf3f3;
  }
  .place-empty {
    padding: 1rem;
    color: hsl(0, 0%, 45%);
  }
</style>
