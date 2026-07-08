<script lang="ts">
  import { adminAuthStore, queryStore, toastStore } from "@lib/store.svelte";
  import { getAppActions, getAppData } from "@lib/context";
  import Users from "@lucide/svelte/icons/users";
  import Mail from "@lucide/svelte/icons/mail";
  import Building2 from "@lucide/svelte/icons/building-2";
  import EntityGoogleMapsLink from "./EntityGoogleMapsLink.svelte";
  import EntityDirectionsChip from "./EntityDirectionsChip.svelte";
  import EntityExternalLink from "./EntityExternalLink.svelte";
  import EntityLastUpdated from "../EntityLastUpdated.svelte";
  import EntityEditorToggle from "@ui/editor/EntityEditorToggle.svelte";
  import type { OrgData } from "@lib/types";
  import { orgCategoryLabel, ORG_CATEGORIES } from "@constants/org-categories";
  import { persistEntityChange } from "@lib/proposals/client";
  import { handlePersistEntityResult } from "@lib/editor/handle-persist-result";

  const appData = getAppData();
  const appActions = getAppActions();
  const { organizations, buildings } = $derived(appData());

  const org = $derived(
    organizations?.find((o) => o.name === queryStore.queryValue),
  );

  const categoryLabel = $derived(org ? orgCategoryLabel(org.category) : null);

  // Resolve the host building (for the "located in" link and coord fallback).
  const hostBuilding = $derived(
    org?.buildingId != null
      ? (buildings?.find((b) => b.id === org.buildingId) ?? null)
      : null,
  );
  const resolvedLat = $derived(org?.lat ?? hostBuilding?.lat ?? null);
  const resolvedLon = $derived(org?.lon ?? hostBuilding?.lon ?? null);

  const canPublish = $derived(adminAuthStore.canPublish);

  let editing = $state(false);
  let draftId = $state<number | null>(null);
  let draftVersion = $state<number | null>(null);
  let nameDraft = $state("");
  let categoryDraft = $state("");
  let descriptionDraft = $state("");
  let websiteDraft = $state("");
  let facebookDraft = $state("");
  let emailDraft = $state("");
  let submitterNameDraft = $state("");
  let saving = $state(false);
  let fieldError = $state<string | null>(null);

  $effect(() => {
    const current = org;
    if (!current) return;
    if (draftId === current.id && draftVersion === current.version) return;
    draftId = current.id;
    draftVersion = current.version;
    nameDraft = current.name;
    categoryDraft = current.category;
    descriptionDraft = current.description ?? "";
    websiteDraft = current.websiteLink ?? "";
    facebookDraft = current.facebookLink ?? "";
    emailDraft = current.email ?? "";
    fieldError = null;
  });

  function syncFromServer(updated: OrgData) {
    appActions.upsertOrganization(updated);
    queryStore.hydrateQuery({
      type: "result",
      category: "organization",
      value: updated.name,
    });
  }

  function openHostBuilding() {
    if (!hostBuilding) return;
    queryStore.updateQuery({
      category: "building",
      type: "result",
      value: hostBuilding.buildingName,
    });
    queryStore.inputValue = hostBuilding.buildingName;
  }

  function buildPatch(current: OrgData): Record<string, unknown> | null {
    const patch: Record<string, unknown> = {};
    const name = nameDraft.trim();
    if (name !== current.name) {
      if (!name) {
        fieldError = "Name cannot be empty.";
        return null;
      }
      patch.name = name;
    }
    if (categoryDraft !== current.category) patch.category = categoryDraft;
    if (descriptionDraft.trim() !== (current.description ?? "")) {
      patch.description = descriptionDraft.trim() || null;
    }
    if (websiteDraft.trim() !== (current.websiteLink ?? "")) {
      patch.websiteLink = websiteDraft.trim() || null;
    }
    if (facebookDraft.trim() !== (current.facebookLink ?? "")) {
      patch.facebookLink = facebookDraft.trim() || null;
    }
    if (emailDraft.trim() !== (current.email ?? "")) {
      patch.email = emailDraft.trim() || null;
    }
    return patch;
  }

  async function submitChanges() {
    const current = org;
    if (!current) return;
    fieldError = null;
    const patch = buildPatch(current);
    if (!patch) return;
    if (Object.keys(patch).length === 0) {
      editing = false;
      return;
    }

    saving = true;
    try {
      const result = await persistEntityChange({
        entityType: "organization",
        entityId: current.id,
        baseVersion: current.version,
        patch,
        entityLabel: current.name,
        canPublish,
        submitterName:
          adminAuthStore.displayName ??
          adminAuthStore.username ??
          submitterNameDraft,
      });

      const outcome = handlePersistEntityResult<OrgData>(result, {
        syncFromServer,
        fallbackError: `${current.name} could not be saved.`,
      });

      if (outcome.error) {
        fieldError = outcome.error;
        return;
      }
      if (outcome.proposal) {
        toastStore.show(
          `Suggestion for ${current.name} submitted for review.`,
          "success",
        );
      } else {
        toastStore.show(`${current.name} updated.`, "success");
      }
      editing = false;
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Network error";
      fieldError = `${current.name} failed to save: ${reason}`;
    } finally {
      saving = false;
    }
  }
</script>

<div class="entity-detail">
  {#if org}
    <header class="entity-header">
      <div class="entity-header__title-row">
        <h2 class="entity-header__title">{org.name}</h2>
      </div>

      <div class="entity-meta-row">
        {#if categoryLabel}
          <span class="entity-meta-chip org-badge">
            <Users size={12} />
            {categoryLabel}
          </span>
        {/if}
        {#if hostBuilding}
          <button
            type="button"
            class="entity-meta-chip building-badge"
            onclick={openHostBuilding}
          >
            <Building2 size={12} />
            {hostBuilding.buildingName}
          </button>
        {/if}
      </div>

      <div class="entity-actions">
        {#if resolvedLat != null && resolvedLon != null}
          <EntityDirectionsChip
            lat={resolvedLat}
            lon={resolvedLon}
            destinationLabel={org.name}
          />
          <EntityGoogleMapsLink
            lat={resolvedLat}
            lon={resolvedLon}
            ariaLabel={`Open ${org.name} in Google Maps`}
          />
        {/if}
        <EntityEditorToggle
          expanded={editing}
          {canPublish}
          publishOpenLabel="Edit"
          closeLabel={canPublish ? "Close editor" : "Close"}
          variant="toolbar"
          onclick={() => (editing = !editing)}
        />
      </div>
    </header>

    {#if !editing}
      <div class="entity-body entity-body--compact">
        {#if org.description}
          <p class="entity-directions__text">{org.description}</p>
        {/if}

        {#if org.email || org.websiteLink || org.facebookLink}
          <div class="entity-dorm-details__links">
            {#if org.websiteLink}
              <EntityExternalLink
                href={org.websiteLink}
                label="Website"
                ariaLabel={`Open ${org.name} website (opens in new tab)`}
              />
            {/if}
            {#if org.facebookLink}
              <EntityExternalLink
                href={org.facebookLink}
                label="Facebook"
                ariaLabel={`Open ${org.name} Facebook page (opens in new tab)`}
              />
            {/if}
          </div>
        {/if}

        {#if org.email}
          <div class="entity-detail-row">
            <Mail size={14} />
            <div class="entity-detail-row__content">
              <span class="entity-detail-row__label">Email</span>
              <a
                href="mailto:{org.email}"
                class="entity-detail-row__value entity-detail-row__value--link"
              >
                {org.email}
              </a>
            </div>
          </div>
        {/if}

        <EntityLastUpdated
          updatedAt={org.updatedAt}
          entityType="organization"
          entityId={org.id}
        />
      </div>
    {/if}

    {#if !editing && org.imageUrl}
      <img
        class="entity-image"
        src={org.imageUrl}
        alt={org.name}
        loading="lazy"
      />
    {/if}

    {#if editing}
      <section
        class="entity-editor"
        aria-label={canPublish
          ? "Edit organization"
          : "Suggest organization edits"}
      >
        <label class="org-field">
          <span class="entity-detail-row__label">Name</span>
          <input class="org-input" type="text" bind:value={nameDraft} />
        </label>
        <label class="org-field">
          <span class="entity-detail-row__label">Category</span>
          <select class="org-input" bind:value={categoryDraft}>
            {#each ORG_CATEGORIES as category}
              <option value={category}>{orgCategoryLabel(category)}</option>
            {/each}
          </select>
        </label>
        <label class="org-field">
          <span class="entity-detail-row__label">Description</span>
          <textarea
            class="org-input"
            rows="3"
            bind:value={descriptionDraft}
          ></textarea>
        </label>
        <label class="org-field">
          <span class="entity-detail-row__label">Website</span>
          <input
            class="org-input"
            type="url"
            placeholder="https://…"
            bind:value={websiteDraft}
          />
        </label>
        <label class="org-field">
          <span class="entity-detail-row__label">Facebook</span>
          <input
            class="org-input"
            type="url"
            placeholder="https://facebook.com/…"
            bind:value={facebookDraft}
          />
        </label>
        <label class="org-field">
          <span class="entity-detail-row__label">Email</span>
          <input class="org-input" type="email" bind:value={emailDraft} />
        </label>

        {#if !canPublish}
          <label class="org-field">
            <span class="entity-detail-row__label">Your name (optional)</span>
            <input
              class="org-input"
              type="text"
              bind:value={submitterNameDraft}
            />
          </label>
        {/if}

        {#if fieldError}
          <p class="org-error" role="alert">{fieldError}</p>
        {/if}

        <button
          type="button"
          class="org-submit"
          disabled={saving}
          onclick={submitChanges}
        >
          {saving
            ? "Saving…"
            : canPublish
              ? "Save changes"
              : "Submit suggestion"}
        </button>
      </section>
    {/if}
  {:else}
    <div class="no-results">Organization not found.</div>
  {/if}
</div>

<style>
  @import "./entity-detail.css";
  @import "../editor/entity-editor.css";
  @import "../map-chrome/map-chrome.css";

  .org-badge {
    background-color: hsl(265, 45%, 92%);
    color: hsl(265, 45%, 34%);
  }

  .building-badge {
    background-color: hsl(5, 40%, 92%);
    color: hsl(5, 45%, 32%);
    border: none;
    cursor: pointer;
  }

  .org-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 0.6rem;
  }

  .org-input {
    width: 100%;
    padding: 0.4rem 0.55rem;
    border: 1px solid hsl(0, 0%, 82%);
    border-radius: 0.375rem;
    font: inherit;
  }

  .org-error {
    color: hsl(0, 65%, 45%);
    font-size: 0.8125rem;
    margin: 0.25rem 0;
  }

  .org-submit {
    margin-top: 0.25rem;
    padding: 0.45rem 0.9rem;
    border: none;
    border-radius: 0.375rem;
    background-color: hsl(265, 45%, 48%);
    color: white;
    font-weight: 600;
    cursor: pointer;
  }

  .org-submit:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .no-results {
    color: #666;
    font-size: 0.875rem;
    text-align: center;
    padding: 1rem 0;
  }
</style>
