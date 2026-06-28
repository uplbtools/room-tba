<script lang="ts">
  import {
    adminAuthStore,
    mapEditStore,
    mapProposalStore,
    queryStore,
    locationStore,
    toastStore,
  } from "@lib/store.svelte";
  import { getAppActions, getAppData } from "@lib/context";
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
  import type { DormData } from "@lib/types";
  import {
    getStoredProposalForEntity,
    persistEntityChange,
  } from "@lib/proposals/client";
  import { handlePersistEntityResult } from "@lib/editor/handle-persist-result";
  import EntityEditorToggle from "@ui/editor/EntityEditorToggle.svelte";
  import DormEditorPanel from "@ui/controls/DormEditorPanel.svelte";
  import CopyLinkButton from "@ui/CopyLinkButton.svelte";
  import { getDormShareUrl } from "@lib/share-links";
  import { normalizeStringList } from "@lib/string-lists";

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
  const dormShareUrl = $derived(dorm ? getDormShareUrl(dorm) : "");

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

  const amenities = $derived(normalizeStringList(dorm?.amenities));

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

      const outcome = handlePersistEntityResult<DormData>(result, {
        syncFromServer: syncDormFromServer,
        fallbackError: `${current.dormName} ${fieldLabel(field)} could not be saved.`,
      });

      if (outcome.error) {
        fieldError = outcome.error;
        return;
      }

      if (outcome.proposal) {
        activeProposalId = outcome.proposal.id;
        proposalStatus = outcome.proposal.status;
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
      <CopyLinkButton
        url={dormShareUrl}
        ariaLabel={`Copy link to ${dorm.dormName}`}
        successMessage={`Copied link for ${dorm.dormName}.`}
        errorMessage={`Could not copy link for ${dorm.dormName}.`}
        feedback="none"
        variant="chip"
        onsuccess={() =>
          toastStore.show(`Copied link for ${dorm.dormName}.`, "success")}
        onerror={() =>
          toastStore.show(
            `Could not copy link for ${dorm.dormName}.`,
            "error",
          )}
      />
      <EntityEditorToggle
        expanded={editing}
        {canPublish}
        publishOpenLabel="Edit dorm"
        closeLabel={canPublish ? "Close editor" : "Close"}
        variant="toolbar"
        onclick={() => (editing = !editing)}
      />
    </div>

    {#if editing}
      <section
        class="entity-editor"
        aria-label={canPublish ? "Edit dorm details" : "Suggest dorm edits"}
      >
        <DormEditorPanel
          {dorm}
          {canPublish}
          {savingField}
          {savedField}
          {fieldError}
          {proposalStatus}
          bind:submitterNameDraft
          bind:nameDraft
          bind:shortNameDraft
          bind:descriptionDraft
          bind:genderDraft
          bind:isUpManagedDraft
          bind:capacityDraft
          bind:priceRangeDraft
          bind:managingOfficeDraft
          bind:contactEmailDraft
          bind:contactPhoneDraft
          bind:amenitiesDraft
          bind:facebookLinkDraft
          bind:osmLinkDraft
          {fieldLabel}
          {fieldIsUnchanged}
          {saveField}
          {enablePinProposal}
        />
      </section>
    {/if}

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

    {#if amenities.length > 0}
      <div class="dorm-amenities">
        <h3 class="section-title">Amenities</h3>
        <div class="amenities-grid">
          {#each amenities as amenity}
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
  @import "../editor/entity-editor.css";

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
</style>
