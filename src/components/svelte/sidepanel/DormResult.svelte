<script lang="ts">
  import {
    adminAuthStore,
    mapEditStore,
    mapProposalStore,
    queryStore,
    locationStore,
    toastStore,
  } from "../../../lib/store.svelte";
  import { getAppActions, getAppData } from "../../../lib/context";
  import CornerRightUp from "@lucide/svelte/icons/corner-right-up";
  import Users from "@lucide/svelte/icons/users";
  import Mail from "@lucide/svelte/icons/mail";
  import Phone from "@lucide/svelte/icons/phone";
  import Building2 from "@lucide/svelte/icons/building-2";
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import BadgeCheck from "@lucide/svelte/icons/badge-check";
  import CircleDollarSign from "@lucide/svelte/icons/circle-dollar-sign";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import type { DormData } from "../../../lib/types";
  import {
    getStoredProposalForEntity,
    persistEntityChange,
  } from "../../../lib/proposals/client";

  type DormEditableField =
    | "dormName"
    | "shortName"
    | "description"
    | "gender"
    | "isUpManaged"
    | "capacity"
    | "priceRange"
    | "managingOffice"
    | "contactEmail"
    | "contactPhone"
    | "amenities"
    | "facebookLink"
    | "osmLink";

  type DormPatchResponse = {
    success?: boolean;
    dorm?: DormData;
    latest?: DormData | null;
    error?: string;
  };

  const appData = getAppData();
  const appActions = getAppActions();
  const { dorms } = $derived(appData());

  const dorm = $derived(
    dorms?.find((d) => d.dormName === queryStore.queryValue),
  );

  let editing = $state(false);
  let draftDormId = $state<number | null>(null);
  let draftVersion = $state<number | null>(null);
  let nameDraft = $state("");
  let shortNameDraft = $state("");
  let descriptionDraft = $state("");
  let genderDraft = $state("");
  let isUpManagedDraft = $state(true);
  let capacityDraft = $state("");
  let priceRangeDraft = $state("");
  let managingOfficeDraft = $state("");
  let contactEmailDraft = $state("");
  let contactPhoneDraft = $state("");
  let amenitiesDraft = $state("");
  let facebookLinkDraft = $state("");
  let osmLinkDraft = $state("");
  let savingField = $state<DormEditableField | null>(null);
  let savedField = $state<DormEditableField | null>(null);
  let fieldError = $state<string | null>(null);
  let submitterNameDraft = $state("");
  let proposalStatus = $state<string | null>(null);
  let activeProposalId = $state<number | null>(null);
  const canPublish = $derived(adminAuthStore.canPublish);

  const fieldLabels: Record<DormEditableField, string> = {
    dormName: "Dorm name",
    shortName: "Short name",
    description: "Description",
    gender: "Gender policy",
    isUpManaged: "UP-managed status",
    capacity: "Capacity",
    priceRange: "Price range",
    managingOffice: "Managing office",
    contactEmail: "Contact email",
    contactPhone: "Contact phones",
    amenities: "Amenities",
    facebookLink: "Facebook link",
    osmLink: "OpenStreetMap link",
  };

  const amenities = $derived<() => string[]>(() => {
    if (!dorm?.amenities) return [];
    try {
      return dorm?.amenities;
    } catch {
      return [];
    }
  });

  const genderLabel = $derived(
    dorm?.gender === "male"
      ? "Male-exclusive"
      : dorm?.gender === "female"
        ? "Female-exclusive"
        : "Co-ed",
  );

  const genderColor = $derived(
    dorm?.gender === "male"
      ? "hsl(210, 65%, 50%)"
      : dorm?.gender === "female"
        ? "hsl(330, 65%, 50%)"
        : "hsl(150, 55%, 40%)",
  );

  const googleMapsLink = $derived(
    dorm?.lat && dorm?.lon
      ? `https://www.google.com/maps?q=${dorm.lat},${dorm.lon}`
      : null,
  );

  /** Only show shortName when it's a real abbreviation, not just the first word */
  const showShortName = $derived(() => {
    if (!dorm || !dorm.shortName) return false;
    const first = dorm?.dormName.split(/\s+/)[0].toLowerCase();
    return dorm.shortName.toLowerCase() !== first;
  });

  function linesToList(text: string) {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function listToLines(items: string[] | null | undefined) {
    return (items ?? []).join("\n");
  }

  function arraysEqual(a: string[], b: string[]) {
    if (a.length !== b.length) return false;
    return a.every((value, index) => value === b[index]);
  }

  $effect(() => {
    const current = dorm;
    if (!current) return;
    if (draftDormId === current.id && draftVersion === current.version) {
      return;
    }

    draftDormId = current.id;
    draftVersion = current.version;
    nameDraft = current.dormName;
    shortNameDraft = current.shortName ?? "";
    descriptionDraft = current.description ?? "";
    genderDraft = current.gender;
    isUpManagedDraft = current.isUpManaged ?? true;
    capacityDraft =
      current.capacity === null || current.capacity === undefined
        ? ""
        : String(current.capacity);
    priceRangeDraft = current.priceRange ?? "";
    managingOfficeDraft = current.managingOffice ?? "";
    contactEmailDraft = current.contactEmail ?? "";
    contactPhoneDraft = listToLines(current.contactPhone);
    amenitiesDraft = listToLines(current.amenities);
    facebookLinkDraft = current.facebookLink ?? "";
    osmLinkDraft = current.osmLink ?? "";
    savedField = null;
    fieldError = null;
    proposalStatus = null;
    const stored = getStoredProposalForEntity("dorm", current.id);
    activeProposalId = stored?.id ?? null;
    if (stored) proposalStatus = stored.status;
  });

  function enablePinProposal() {
    const current = dorm;
    if (!current?.lat || !current.lon) return;
    mapProposalStore.enable(
      {
        type: "dorm",
        id: current.id,
        label: current.dormName,
        version: current.version,
      },
      submitterNameDraft,
      activeProposalId,
    );
    toastStore.show(
      `Drag the ${current.dormName} pin on the map, then release to submit.`,
      "info",
    );
  }

  function fieldLabel(field: DormEditableField) {
    return fieldLabels[field];
  }

  function fieldActionLabel(field: DormEditableField) {
    if (savingField === field) return canPublish ? "Saving..." : "Submitting...";
    return canPublish ? "Save" : "Submit";
  }

  function syncDormFromServer(updated: DormData) {
    appActions.replaceDorm(updated);
    queryStore.hydrateQuery({
      type: "result",
      category: "dorm",
      value: updated.dormName,
    });
  }

  function fieldIsUnchanged(field: DormEditableField, current: DormData) {
    switch (field) {
      case "dormName":
        return nameDraft.trim() === current.dormName;
      case "shortName":
        return shortNameDraft.trim() === (current.shortName ?? "");
      case "description":
        return descriptionDraft.trim() === (current.description ?? "");
      case "gender":
        return genderDraft === current.gender;
      case "isUpManaged":
        return isUpManagedDraft === (current.isUpManaged ?? true);
      case "capacity": {
        const parsed =
          capacityDraft.trim() === "" ? null : Number(capacityDraft);
        return parsed === current.capacity;
      }
      case "priceRange":
        return priceRangeDraft.trim() === (current.priceRange ?? "");
      case "managingOffice":
        return managingOfficeDraft.trim() === (current.managingOffice ?? "");
      case "contactEmail":
        return contactEmailDraft.trim() === (current.contactEmail ?? "");
      case "contactPhone":
        return arraysEqual(
          linesToList(contactPhoneDraft),
          current.contactPhone ?? [],
        );
      case "amenities":
        return arraysEqual(
          linesToList(amenitiesDraft),
          current.amenities ?? [],
        );
      case "facebookLink":
        return facebookLinkDraft.trim() === (current.facebookLink ?? "");
      case "osmLink":
        return osmLinkDraft.trim() === (current.osmLink ?? "");
    }
  }

  async function saveField(field: DormEditableField) {
    const current = dorm;
    if (!current) return;

    const body: {
      version: number;
      dormName?: string;
      shortName?: string | null;
      description?: string | null;
      gender?: string;
      isUpManaged?: boolean;
      capacity?: number | null;
      priceRange?: string | null;
      managingOffice?: string | null;
      contactEmail?: string | null;
      contactPhone?: string[];
      amenities?: string[];
      facebookLink?: string | null;
      osmLink?: string | null;
    } = { version: current.version };

    if (field === "dormName") {
      const trimmedName = nameDraft.trim();
      if (trimmedName.length === 0) {
        fieldError = `${current.dormName} name cannot be empty.`;
        return;
      }
      body.dormName = trimmedName;
    } else if (field === "shortName") {
      body.shortName = shortNameDraft.trim() || null;
    } else if (field === "description") {
      body.description = descriptionDraft.trim() || null;
    } else if (field === "gender") {
      body.gender = genderDraft;
    } else if (field === "isUpManaged") {
      body.isUpManaged = isUpManagedDraft;
    } else if (field === "capacity") {
      if (capacityDraft.trim() === "") {
        body.capacity = null;
      } else {
        const parsed = Number(capacityDraft);
        if (!Number.isFinite(parsed) || parsed < 0) {
          fieldError = `${current.dormName} capacity must be a non-negative number.`;
          return;
        }
        body.capacity = parsed;
      }
    } else if (field === "priceRange") {
      body.priceRange = priceRangeDraft.trim() || null;
    } else if (field === "managingOffice") {
      body.managingOffice = managingOfficeDraft.trim() || null;
    } else if (field === "contactEmail") {
      body.contactEmail = contactEmailDraft.trim() || null;
    } else if (field === "contactPhone") {
      body.contactPhone = linesToList(contactPhoneDraft);
    } else if (field === "amenities") {
      body.amenities = linesToList(amenitiesDraft);
    } else if (field === "facebookLink") {
      body.facebookLink = facebookLinkDraft.trim() || null;
    } else if (field === "osmLink") {
      body.osmLink = osmLinkDraft.trim() || null;
    }

    savingField = field;
    savedField = null;
    fieldError = null;

    try {
      const { version, ...patch } = body;
      const result = await persistEntityChange({
        entityType: "dorm",
        entityId: current.id,
        baseVersion: current.version,
        patch,
        entityLabel: current.dormName,
        canPublish,
        submitterName:
          adminAuthStore.displayName ??
          adminAuthStore.username ??
          submitterNameDraft,
        proposalId: activeProposalId,
      });

      if (!result.ok) {
        if (result.latest) syncDormFromServer(result.latest as DormData);
        fieldError =
          result.error ??
          `${current.dormName} ${fieldLabel(field)} could not be saved.`;
        return;
      }

      if (result.published) {
        syncDormFromServer(result.published as DormData);
      } else if (result.proposal) {
        activeProposalId = result.proposal.id;
        proposalStatus = result.proposal.status;
        toastStore.show(
          `Suggestion for ${current.dormName} submitted for review.`,
          "success",
        );
      }
      savedField = field;
      setTimeout(() => {
        if (savedField === field) savedField = null;
      }, 1800);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Network error";
      fieldError = `${current.dormName} ${fieldLabel(field)} failed to save: ${reason}`;
    } finally {
      savingField = null;
    }
  }
</script>

<div class="dorm-result-wrapper">
  {#if dorm}
    <div class="dorm-header">
      <h2 class="dorm-title">{dorm.dormName}</h2>
      {#if showShortName()}
        <span class="dorm-short-name">{dorm.shortName}</span>
      {/if}
    </div>

    <div class="dorm-badges">
      {#if dorm.isUpManaged}
        <span class="badge up-badge">
          <BadgeCheck size={14} />
          UP-managed
        </span>
      {:else}
        <span class="badge private-badge"> Private </span>
      {/if}
      <span class="badge gender-badge" style:--badge-color={genderColor}>
        <Users size={14} />
        {genderLabel}
      </span>
      {#if dorm.capacity}
        <span class="badge capacity-badge">
          <Building2 size={14} />
          {dorm.capacity} beds
        </span>
      {/if}
    </div>

    {#if dorm.priceRange}
      <div class="price-row">
        <CircleDollarSign size={16} />
        <span class="price-value">{dorm.priceRange}</span>
        {#if !dorm.isUpManaged}
          <span class="price-disclaimer">
            <TriangleAlert size={12} />
            Verify with owner
          </span>
        {/if}
      </div>
    {/if}

    {#if dorm.description}
      <p class="dorm-desc">{dorm.description}</p>
    {/if}

    <div class="dorm-actions">
      {#if dorm.lon && dorm.lat}
        <button
          class="action-btn directions-btn"
          onclick={() => {
            locationStore.requestLocation();
            locationStore.setDestination([dorm.lon ?? 0, dorm.lat ?? 0]);
          }}
        >
          <CornerRightUp size={16} />
          Directions
        </button>
      {/if}
      {#if googleMapsLink}
        <a
          href={googleMapsLink}
          target="_blank"
          rel="noopener noreferrer"
          class="action-btn gmaps-btn"
        >
          <MapPin size={16} />
          Google Maps
        </a>
      {/if}
      {#if dorm.facebookLink}
        <a
          href={dorm.facebookLink}
          target="_blank"
          rel="noopener noreferrer"
          class="action-btn social-btn"
        >
          <ExternalLink size={16} />
          Facebook
        </a>
      {/if}
    </div>

    <section class="dorm-editor" aria-label="Edit dorm details">
      <button
        type="button"
        class="editor-toggle"
        aria-expanded={editing}
        onclick={() => (editing = !editing)}
      >
        {editing
          ? "Close"
          : canPublish
            ? "Edit dorm"
            : "Suggest an edit"}
      </button>
      {#if editing}
        <div class="editor-heading">
          <span>{canPublish ? "Editor" : "Suggest a change"}</span>
        </div>

        {#if !canPublish && !adminAuthStore.isLoggedIn}
          <div class="editor-field">
            <label for="dorm-submitter-name">Your name</label>
            <input
              id="dorm-submitter-name"
              bind:value={submitterNameDraft}
              maxlength="100"
              autocomplete="name"
            />
          </div>
        {/if}

        {#if proposalStatus}
          <p class="editor-message pending">
            Status: {proposalStatus.replace("_", " ")} — waiting for editor review.
          </p>
        {/if}

          <div class="editor-field">
            <label for="dorm-name-editor">Dorm name</label>
            <div class="editor-control-row">
              <input
                id="dorm-name-editor"
                bind:value={nameDraft}
                disabled={savingField !== null}
                autocomplete="off"
              />
              <button
                class="field-save-btn"
                disabled={savingField !== null ||
                  fieldIsUnchanged("dormName", dorm)}
                onclick={() => saveField("dormName")}
              >
                {fieldActionLabel("dormName")}
              </button>
            </div>
          </div>

          <div class="editor-field">
            <label for="dorm-short-name-editor">Short name</label>
            <div class="editor-control-row">
              <input
                id="dorm-short-name-editor"
                bind:value={shortNameDraft}
                disabled={savingField !== null}
                autocomplete="off"
              />
              <button
                class="field-save-btn"
                disabled={savingField !== null ||
                  fieldIsUnchanged("shortName", dorm)}
                onclick={() => saveField("shortName")}
              >
                {savingField === "shortName" ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          <div class="editor-field">
            <label for="dorm-description-editor">Description</label>
            <div class="editor-control-row stacked">
              <textarea
                id="dorm-description-editor"
                bind:value={descriptionDraft}
                disabled={savingField !== null}
                rows="3"></textarea>
              <button
                class="field-save-btn"
                disabled={savingField !== null ||
                  fieldIsUnchanged("description", dorm)}
                onclick={() => saveField("description")}
              >
                {savingField === "description" ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          <div class="editor-grid">
            <div class="editor-field">
              <label for="dorm-gender-editor">Gender policy</label>
              <div class="editor-control-row">
                <select
                  id="dorm-gender-editor"
                  bind:value={genderDraft}
                  disabled={savingField !== null}
                >
                  <option value="male">Male-exclusive</option>
                  <option value="female">Female-exclusive</option>
                  <option value="coed">Co-ed</option>
                  <option value="Mixed">Mixed</option>
                </select>
                <button
                  class="field-save-btn"
                  disabled={savingField !== null ||
                    fieldIsUnchanged("gender", dorm)}
                  onclick={() => saveField("gender")}
                >
                  {savingField === "gender" ? "Saving..." : "Save"}
                </button>
              </div>
            </div>

            <div class="editor-field">
              <label for="dorm-capacity-editor">Capacity (beds)</label>
              <div class="editor-control-row">
                <input
                  id="dorm-capacity-editor"
                  type="number"
                  min="0"
                  bind:value={capacityDraft}
                  disabled={savingField !== null}
                />
                <button
                  class="field-save-btn"
                  disabled={savingField !== null ||
                    fieldIsUnchanged("capacity", dorm)}
                  onclick={() => saveField("capacity")}
                >
                  {savingField === "capacity" ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>

          <div class="editor-field checkbox-field">
            <label class="checkbox-label">
              <input
                type="checkbox"
                bind:checked={isUpManagedDraft}
                disabled={savingField !== null}
              />
              UP-managed dorm
            </label>
            <button
              class="field-save-btn"
              disabled={savingField !== null ||
                fieldIsUnchanged("isUpManaged", dorm)}
              onclick={() => saveField("isUpManaged")}
            >
              {savingField === "isUpManaged" ? "Saving..." : "Save"}
            </button>
          </div>

          <div class="editor-field">
            <label for="dorm-price-editor">Price range</label>
            <div class="editor-control-row">
              <input
                id="dorm-price-editor"
                bind:value={priceRangeDraft}
                disabled={savingField !== null}
              />
              <button
                class="field-save-btn"
                disabled={savingField !== null ||
                  fieldIsUnchanged("priceRange", dorm)}
                onclick={() => saveField("priceRange")}
              >
                {savingField === "priceRange" ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          <div class="editor-field">
            <label for="dorm-office-editor">Managing office</label>
            <div class="editor-control-row">
              <input
                id="dorm-office-editor"
                bind:value={managingOfficeDraft}
                disabled={savingField !== null}
              />
              <button
                class="field-save-btn"
                disabled={savingField !== null ||
                  fieldIsUnchanged("managingOffice", dorm)}
                onclick={() => saveField("managingOffice")}
              >
                {savingField === "managingOffice" ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          <div class="editor-field">
            <label for="dorm-email-editor">Contact email</label>
            <div class="editor-control-row">
              <input
                id="dorm-email-editor"
                type="email"
                bind:value={contactEmailDraft}
                disabled={savingField !== null}
              />
              <button
                class="field-save-btn"
                disabled={savingField !== null ||
                  fieldIsUnchanged("contactEmail", dorm)}
                onclick={() => saveField("contactEmail")}
              >
                {savingField === "contactEmail" ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          <div class="editor-field">
            <label for="dorm-phone-editor">Contact phones</label>
            <div class="editor-control-row stacked">
              <textarea
                id="dorm-phone-editor"
                bind:value={contactPhoneDraft}
                disabled={savingField !== null}
                rows="3"
                placeholder="One phone number per line"></textarea>
              <button
                class="field-save-btn"
                disabled={savingField !== null ||
                  fieldIsUnchanged("contactPhone", dorm)}
                onclick={() => saveField("contactPhone")}
              >
                {savingField === "contactPhone" ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          <div class="editor-field">
            <label for="dorm-amenities-editor">Amenities</label>
            <div class="editor-control-row stacked">
              <textarea
                id="dorm-amenities-editor"
                bind:value={amenitiesDraft}
                disabled={savingField !== null}
                rows="4"
                placeholder="One amenity per line"></textarea>
              <button
                class="field-save-btn"
                disabled={savingField !== null ||
                  fieldIsUnchanged("amenities", dorm)}
                onclick={() => saveField("amenities")}
              >
                {savingField === "amenities" ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          <div class="editor-field">
            <label for="dorm-facebook-editor">Facebook link</label>
            <div class="editor-control-row">
              <input
                id="dorm-facebook-editor"
                type="url"
                bind:value={facebookLinkDraft}
                disabled={savingField !== null}
              />
              <button
                class="field-save-btn"
                disabled={savingField !== null ||
                  fieldIsUnchanged("facebookLink", dorm)}
                onclick={() => saveField("facebookLink")}
              >
                {savingField === "facebookLink" ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          <div class="editor-field">
            <label for="dorm-osm-editor">OpenStreetMap link</label>
            <div class="editor-control-row">
              <input
                id="dorm-osm-editor"
                type="url"
                bind:value={osmLinkDraft}
                disabled={savingField !== null}
              />
              <button
                class="field-save-btn"
                disabled={savingField !== null ||
                  fieldIsUnchanged("osmLink", dorm)}
                onclick={() => saveField("osmLink")}
              >
                {savingField === "osmLink" ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          <p class="editor-note">
            {#if canPublish}
              {#if mapEditStore.enabled}
                Map editing is on — drag this dorm's pin on the map to move it.
              {:else}
                To move this dorm's map pin,
                <button
                  type="button"
                  class="inline-link-btn"
                  onclick={() => mapEditStore.enable()}
                >
                  enable map editing
                </button>
                from the shield control, then drag its marker.
              {/if}
            {:else if dorm.lat && dorm.lon}
              {#if mapProposalStore.allowsKey(`dorm:${dorm.id}`)}
                Pin move mode is on — drag this dorm's marker on the map.
              {:else}
                To suggest a map pin move,
                <button
                  type="button"
                  class="inline-link-btn"
                  onclick={enablePinProposal}
                >
                  enable pin move
                </button>
                , then drag its marker.
              {/if}
            {/if}
          </p>

          {#if savedField}
            <p class="editor-message success">
              {canPublish
                ? `${fieldLabel(savedField)} saved.`
                : "Suggestion submitted."}
            </p>
          {/if}
          {#if fieldError}
            <p class="editor-message error">{fieldError}</p>
          {/if}
        {/if}
      </section>

    <hr class="dorm-divider" />

    <div class="dorm-details">
      <h3 class="section-title">Details</h3>

      {#if dorm.managingOffice}
        <div class="detail-row">
          <Building2 size={16} />
          <div>
            <span class="detail-label">Managing Office</span>
            <span class="detail-value">{dorm.managingOffice}</span>
          </div>
        </div>
      {/if}

      {#if dorm.contactEmail}
        <div class="detail-row">
          <Mail size={16} />
          <div>
            <span class="detail-label">Email</span>
            <a
              href="mailto:{dorm.contactEmail}"
              class="detail-value email-link"
            >
              {dorm.contactEmail}
            </a>
          </div>
        </div>
      {/if}

      {#if dorm.contactPhone}
        <div class="detail-row">
          <Phone size={16} />
          <div>
            <span class="detail-label">Phone</span>
            <span class="detail-value">{dorm.contactPhone}</span>
          </div>
        </div>
      {/if}
    </div>

    {#if amenities().length > 0}
      <div class="dorm-amenities">
        <h3 class="section-title">Amenities</h3>
        <div class="amenities-grid">
          {#each amenities() as amenity}
            <span class="amenity-tag">{amenity}</span>
          {/each}
        </div>
      </div>
    {/if}

    <div class="dorm-footer">
      {#if dorm.isUpManaged}
        <a
          href="https://uplbosa.org"
          target="_blank"
          rel="noopener noreferrer"
          class="osa-link"
        >
          <ExternalLink size={14} />
          UPLB OSA Website
        </a>
      {:else}
        <div class="private-tip">
          <TriangleAlert size={14} />
          <span
            >Prices and details may change. Always verify in person or contact
            directly before committing.</span
          >
        </div>
      {/if}
    </div>
  {:else}
    <div class="no-results">Dorm not found.</div>
  {/if}
</div>

<style>
  .dorm-result-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
    flex: 1 1 0;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: hsl(6, 63%, 48%) hsl(0, 0%, 98%);
  }

  .dorm-header {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .dorm-title {
    font-size: 1.125rem;
    font-weight: bold;
    color: black;
    margin: 0;
    line-height: 1.3;
  }

  .dorm-short-name {
    font-size: 0.75rem;
    color: #7b1113;
    background-color: hsl(5, 53%, 95%);
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .dorm-badges {
    display: flex;
    gap: 0.375rem;
    flex-wrap: wrap;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.625rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .gender-badge {
    background-color: color-mix(in srgb, var(--badge-color) 15%, white);
    color: var(--badge-color);
  }

  .capacity-badge {
    background-color: hsl(0, 0%, 93%);
    color: #4f4f4f;
  }

  .up-badge {
    background-color: hsl(5, 53%, 93%);
    color: #7b1113;
  }

  .private-badge {
    background-color: hsl(210, 50%, 93%);
    color: hsl(210, 60%, 40%);
  }

  .price-row {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    color: #333;
    font-size: 0.8125rem;
    font-weight: 600;
  }

  .price-value {
    color: hsl(150, 45%, 35%);
  }

  .price-disclaimer {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    font-size: 0.6875rem;
    color: hsl(35, 80%, 45%);
    font-weight: 500;
  }

  .dorm-desc {
    font-size: 0.8125rem;
    color: #4f4f4f;
    margin: 0;
    line-height: 1.5;
  }

  .dorm-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
    text-decoration: none;
    width: max-content;
  }

  .directions-btn {
    background-color: #7b1113;
    color: white;
  }

  .directions-btn:hover {
    background-color: #9a1517;
  }

  .gmaps-btn {
    background-color: hsl(210, 50%, 93%);
    color: hsl(210, 60%, 35%);
  }

  .gmaps-btn:hover {
    background-color: hsl(210, 50%, 87%);
  }

  .social-btn {
    background-color: hsl(220, 50%, 93%);
    color: hsl(220, 60%, 40%);
  }

  .social-btn:hover {
    background-color: hsl(220, 50%, 87%);
  }

  .dorm-divider {
    margin: 0.25rem 0;
    border: none;
    border-top: 1px solid #ececec;
  }

  .dorm-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .section-title {
    font-size: 0.8125rem;
    font-weight: 700;
    color: #333;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .detail-row {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    color: #666;
  }

  .detail-row > div {
    display: flex;
    flex-direction: column;
  }

  .detail-label {
    font-size: 0.6875rem;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .detail-value {
    font-size: 0.8125rem;
    color: #333;
  }

  .email-link {
    color: #7b1113;
    text-decoration: none;
  }

  .email-link:hover {
    text-decoration: underline;
  }

  .dorm-amenities {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .amenities-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .amenity-tag {
    padding: 0.25rem 0.625rem;
    background-color: hsl(0, 0%, 96%);
    border: 1px solid hsl(0, 0%, 90%);
    border-radius: 0.375rem;
    font-size: 0.75rem;
    color: #555;
  }

  .dorm-footer {
    margin-top: auto;
    padding-top: 0.5rem;
    border-top: 1px solid #ececec;
  }

  .osa-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: #7b1113;
    text-decoration: none;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    transition: background-color 0.15s;
  }

  .osa-link:hover {
    background-color: hsl(5, 53%, 95%);
  }

  .private-tip {
    display: flex;
    align-items: flex-start;
    gap: 0.375rem;
    font-size: 0.6875rem;
    color: hsl(35, 80%, 45%);
    line-height: 1.4;
    padding: 0.375rem 0;
  }

  .no-results {
    color: #666;
    font-size: 0.875rem;
    text-align: center;
    padding: 1rem 0;
  }

  .dorm-editor {
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

  .editor-heading {
    color: hsl(5, 53%, 32%);
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .editor-grid,
  .editor-field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .editor-grid {
    gap: 0.5rem;
  }

  .editor-field label {
    color: #555;
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .checkbox-field {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .checkbox-label {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    text-transform: none;
    font-size: 0.8125rem;
    font-weight: 600;
    color: #333;
  }

  .editor-control-row {
    display: flex;
    gap: 0.375rem;
    align-items: stretch;
  }

  .editor-control-row.stacked {
    flex-direction: column;
  }

  .editor-control-row input,
  .editor-control-row select,
  .editor-control-row textarea {
    min-width: 0;
    flex: 1;
    border: 1px solid #d8d8d8;
    border-radius: 0.5rem;
    padding: 0.45rem 0.55rem;
    font: inherit;
    font-size: 0.8125rem;
    color: #222;
    background: white;
  }

  .editor-control-row textarea {
    resize: vertical;
    min-height: 4rem;
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

  .editor-note {
    margin: 0;
    color: #666;
    font-size: 0.75rem;
    line-height: 1.45;
  }

  .inline-link-btn {
    border: none;
    background: none;
    color: #7b1113;
    cursor: pointer;
    font: inherit;
    font-size: inherit;
    font-weight: 700;
    padding: 0;
    text-decoration: underline;
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
