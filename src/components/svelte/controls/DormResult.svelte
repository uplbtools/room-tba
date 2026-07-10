<script lang="ts">
  import {
    adminAuthStore,
    mapEditStore,
    mapProposalStore,
    queryStore,
    toastStore,
  } from "@lib/store.svelte";
  import { getAppActions, getAppData } from "@lib/context";
  import Users from "@lucide/svelte/icons/users";
  import Mail from "@lucide/svelte/icons/mail";
  import Phone from "@lucide/svelte/icons/phone";
  import Building2 from "@lucide/svelte/icons/building-2";
  import EntityGoogleMapsLink from "./EntityGoogleMapsLink.svelte";
  import EntityDirectionsChip from "./EntityDirectionsChip.svelte";
  import BadgeCheck from "@lucide/svelte/icons/badge-check";
  import KeyRound from "@lucide/svelte/icons/key-round";
  import CircleDollarSign from "@lucide/svelte/icons/circle-dollar-sign";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import type { DormData } from "@lib/types";
  import {
    getStoredProposalForEntity,
    mergeEntityRecord,
    persistEntityChange,
  } from "@lib/proposals/client";
  import { handlePersistEntityResult } from "@lib/editor/handle-persist-result";
  import MergeEntityPrompt from "@ui/editor/MergeEntityPrompt.svelte";
  import {
    clearEntityContributorDraft,
    readEntityContributorDraft,
    scheduleEntityContributorDraftSave,
  } from "@lib/contributor-drafts";
  import EntityEditorToggle from "@ui/editor/EntityEditorToggle.svelte";
  import DormEditorPanel from "@ui/controls/DormEditorPanel.svelte";
  import EntityLastUpdated from "../EntityLastUpdated.svelte";
  import EntityShareCopyLink from "./EntityShareCopyLink.svelte";
  import EntityExternalLink from "./EntityExternalLink.svelte";
  import { getDormShareUrl } from "@lib/share-links";
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
    | "osmLink"
    | "imageUrl";

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
  let imageDraft = $state<string | null>(null);
  let savingField = $state<DormEditableField | null>(null);
  let savedField = $state<DormEditableField | null>(null);
  let fieldError = $state<string | null>(null);
  let submitterNameDraft = $state("");
  let proposalStatus = $state<string | null>(null);
  let activeProposalId = $state<number | null>(null);
  let mergePrompt = $state<{
    candidate: DormData;
    attemptedName: string;
    sourceVersion: number;
  } | null>(null);
  let mergingEntity = $state(false);
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
    imageUrl: "Dorm photo",
  };

  const amenities = $derived(dorm?.amenities ?? []);
  const contactPhones = $derived(dorm?.contactPhone ?? []);
  const showDormDetails = $derived(
    Boolean(
      dorm &&
      (dorm.managingOffice ||
        dorm.contactEmail ||
        contactPhones.length > 0 ||
        amenities.length > 0 ||
        dorm.isUpManaged ||
        dorm.facebookLink ||
        (!dorm.isUpManaged && dorm.priceRange)),
    ),
  );

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

  /** Only show shortName when it's a real abbreviation, not just the first word */
  const showShortName = $derived.by(() => {
    if (!dorm?.shortName) return false;
    const first = dorm.dormName.split(/\s+/)[0].toLowerCase();
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
    imageDraft = current.imageUrl ?? null;
    savedField = null;
    fieldError = null;
    mergePrompt = null;
    proposalStatus = null;
    const stored = getStoredProposalForEntity("dorm", current.id);
    activeProposalId = stored?.id ?? null;
    if (stored) proposalStatus = stored.status;

    if (!canPublish) {
      const saved = readEntityContributorDraft("dorm", current.id);
      if (saved) {
        // if (saved.editing) editing = true;
        const { fields } = saved;
        if (typeof fields.nameDraft === "string") nameDraft = fields.nameDraft;
        if (typeof fields.shortNameDraft === "string") {
          shortNameDraft = fields.shortNameDraft;
        }
        if (typeof fields.descriptionDraft === "string") {
          descriptionDraft = fields.descriptionDraft;
        }
        if (typeof fields.genderDraft === "string") {
          genderDraft = fields.genderDraft;
        }
        if (typeof fields.isUpManagedDraft === "boolean") {
          isUpManagedDraft = fields.isUpManagedDraft;
        }
        if (typeof fields.capacityDraft === "string") {
          capacityDraft = fields.capacityDraft;
        }
        if (typeof fields.priceRangeDraft === "string") {
          priceRangeDraft = fields.priceRangeDraft;
        }
        if (typeof fields.managingOfficeDraft === "string") {
          managingOfficeDraft = fields.managingOfficeDraft;
        }
        if (typeof fields.contactEmailDraft === "string") {
          contactEmailDraft = fields.contactEmailDraft;
        }
        if (typeof fields.contactPhoneDraft === "string") {
          contactPhoneDraft = fields.contactPhoneDraft;
        }
        if (typeof fields.amenitiesDraft === "string") {
          amenitiesDraft = fields.amenitiesDraft;
        }
        if (typeof fields.facebookLinkDraft === "string") {
          facebookLinkDraft = fields.facebookLinkDraft;
        }
        if (typeof fields.osmLinkDraft === "string") {
          osmLinkDraft = fields.osmLinkDraft;
        }
      }
    }
  });

  $effect(() => {
    if (canPublish || !editing || !dorm) return;
    scheduleEntityContributorDraftSave("dorm", dorm.id, () => ({
      editing: true,
      fields: {
        nameDraft,
        shortNameDraft,
        descriptionDraft,
        genderDraft,
        isUpManagedDraft,
        capacityDraft,
        priceRangeDraft,
        managingOfficeDraft,
        contactEmailDraft,
        contactPhoneDraft,
        amenitiesDraft,
        facebookLinkDraft,
        osmLinkDraft,
      },
    }));
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
    appActions.upsertDorm(updated);
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
      case "imageUrl":
        return (imageDraft ?? null) === (current.imageUrl ?? null);
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
      imageUrl?: string | null;
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
    } else if (field === "imageUrl") {
      body.imageUrl = imageDraft || null;
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
        if (outcome.mergeCandidate && field === "dormName") {
          mergePrompt = {
            candidate: outcome.mergeCandidate as DormData,
            attemptedName: body.dormName ?? nameDraft.trim(),
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
        clearEntityContributorDraft("dorm", current.id);
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

  function dismissMergePrompt() {
    mergePrompt = null;
    const current = dorm;
    if (current) nameDraft = current.dormName;
  }

  async function confirmDormMerge() {
    const current = dorm;
    if (!current || !mergePrompt) return;

    mergingEntity = true;
    fieldError = null;

    try {
      const result = await mergeEntityRecord({
        entityType: "dorm",
        sourceId: current.id,
        targetId: mergePrompt.candidate.id,
        sourceVersion: mergePrompt.sourceVersion,
        preferredName: mergePrompt.attemptedName,
      });

      if (!result.ok) {
        if (result.latest) syncDormFromServer(result.latest as DormData);
        fieldError =
          result.error ??
          `${current.dormName} could not be merged into ${mergePrompt.candidate.dormName}.`;
        return;
      }

      if (result.entity) {
        syncDormFromServer(result.entity as DormData);
        toastStore.show(
          `Merged ${current.dormName} into ${mergePrompt.candidate.dormName}.`,
          "success",
        );
      }
      mergePrompt = null;
      editing = false;
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Network error";
      fieldError = `Merge failed: ${reason}`;
    } finally {
      mergingEntity = false;
    }
  }

  const ALL_DORM_FIELDS: DormEditableField[] = [
    "dormName",
    "shortName",
    "description",
    "gender",
    "isUpManaged",
    "capacity",
    "priceRange",
    "managingOffice",
    "contactEmail",
    "contactPhone",
    "amenities",
    "facebookLink",
    "osmLink",
  ];

  const allFieldsUnchanged = $derived.by(() => {
    const current = dorm;
    if (!current) return true;
    return ALL_DORM_FIELDS.every((field) => fieldIsUnchanged(field, current));
  });

  async function submitAllChanges() {
    const current = dorm;
    if (!current || allFieldsUnchanged) return;

    const patch: Record<string, unknown> = {};

    if (!fieldIsUnchanged("dormName", current)) {
      const trimmedName = nameDraft.trim();
      if (trimmedName.length === 0) {
        fieldError = `${current.dormName} name cannot be empty.`;
        return;
      }
      patch.dormName = trimmedName;
    }
    if (!fieldIsUnchanged("shortName", current)) patch.shortName = shortNameDraft.trim() || null;
    if (!fieldIsUnchanged("description", current)) patch.description = descriptionDraft.trim() || null;
    if (!fieldIsUnchanged("gender", current)) patch.gender = genderDraft;
    if (!fieldIsUnchanged("isUpManaged", current)) patch.isUpManaged = isUpManagedDraft;
    if (!fieldIsUnchanged("capacity", current)) {
      patch.capacity = capacityDraft.trim() === "" ? null : Number(capacityDraft);
    }
    if (!fieldIsUnchanged("priceRange", current)) patch.priceRange = priceRangeDraft.trim() || null;
    if (!fieldIsUnchanged("managingOffice", current)) patch.managingOffice = managingOfficeDraft.trim() || null;
    if (!fieldIsUnchanged("contactEmail", current)) patch.contactEmail = contactEmailDraft.trim() || null;
    if (!fieldIsUnchanged("contactPhone", current)) patch.contactPhone = linesToList(contactPhoneDraft);
    if (!fieldIsUnchanged("amenities", current)) patch.amenities = linesToList(amenitiesDraft);
    if (!fieldIsUnchanged("facebookLink", current)) patch.facebookLink = facebookLinkDraft.trim() || null;
    if (!fieldIsUnchanged("osmLink", current)) patch.osmLink = osmLinkDraft.trim() || null;

    savingField = "dormName" as DormEditableField;
    savedField = null;
    fieldError = null;

    try {
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
        fallbackError: `${current.dormName} could not be saved.`,
      });

      if (outcome.error) {
        fieldError = outcome.error;
        return;
      }

      if (outcome.proposal) {
        activeProposalId = outcome.proposal.id;
        proposalStatus = outcome.proposal.status;
        clearEntityContributorDraft("dorm", current.id);
        toastStore.show(
          `Suggestion for ${current.dormName} submitted for review.`,
          "success",
        );
      }
      savedField = "dormName" as DormEditableField;
      setTimeout(() => {
        if (savedField === "dormName") savedField = null;
      }, 1800);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Network error";
      fieldError = `${current.dormName} failed to save: ${reason}`;
    } finally {
      savingField = null;
    }
  }
</script>

<div class="entity-detail">
  {#if dorm}
    <header class="entity-header">
      <div class="entity-header__title-row">
        <h2 class="entity-header__title">
          {dorm.dormName}
          {#if showShortName}
            <span class="entity-header__abbrev">{dorm.shortName}</span>
          {/if}
        </h2>
      </div>

      <div class="entity-meta-row">
        {#if dorm.isUpManaged}
          <span class="entity-meta-chip up-badge">
            <BadgeCheck size={12} />
            UP-managed
          </span>
        {:else}
          <span class="entity-meta-chip private-badge">
            <KeyRound size={12} />
            Private
          </span>
        {/if}
        <span
          class="entity-meta-chip gender-badge"
          style:--badge-color={genderColor}
        >
          <Users size={12} />
          {genderLabel}
        </span>
        {#if dorm.capacity}
          <span class="entity-meta-chip capacity-badge">
            <Building2 size={12} />
            {dorm.capacity} beds
          </span>
        {/if}
        {#if dorm.priceRange}
          <span class="entity-meta-chip price-badge">
            <CircleDollarSign size={12} aria-hidden="true" />
            {dorm.priceRange}
          </span>
        {/if}
      </div>

      <div class="entity-actions">
        {#if dorm.lon && dorm.lat}
          <EntityDirectionsChip
            lat={dorm.lat}
            lon={dorm.lon}
            destinationLabel={dorm.dormName}
          />
          <EntityGoogleMapsLink
            lat={dorm.lat}
            lon={dorm.lon}
            ariaLabel={`Open ${dorm.dormName} in Google Maps`}
          />
        {/if}
        <EntityShareCopyLink url={dormShareUrl} entityLabel={dorm.dormName} />
        <EntityEditorToggle
          expanded={editing}
          {canPublish}
          publishOpenLabel="Edit dorm"
          closeLabel={canPublish ? "Close editor" : "Close"}
          variant="toolbar"
          onclick={() => (editing = !editing)}
        />
      </div>
    </header>

    {#if !editing}
      <div class="entity-body entity-body--compact">
        {#if dorm.description}
          <p class="entity-directions__text">{dorm.description}</p>
        {/if}
        <EntityLastUpdated
          updatedAt={dorm.updatedAt}
          entityType="dorm"
          entityId={dorm.id}
        />
      </div>
    {/if}

    {#if !editing && dorm.imageUrl}
      <img
        class="entity-image"
        src={dorm.imageUrl}
        alt={dorm.dormName}
        loading="lazy"
      />
    {/if}

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
          activeProposalId={activeProposalId}
          onWithdrawn={() => {
            activeProposalId = null;
            proposalStatus = null;
          }}
          onsubmit={submitAllChanges}
          submitting={savingField !== null}
          submitDisabled={allFieldsUnchanged}
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
          bind:imageDraft
          {fieldLabel}
          {fieldIsUnchanged}
          {saveField}
          {enablePinProposal}
        />

        {#if mergePrompt}
          <MergeEntityPrompt
            entityKind="dorm"
            sourceLabel={dorm.dormName}
            candidateLabel={mergePrompt.candidate.dormName}
            detail="Merge event links and metadata into the kept dorm;"
            merging={mergingEntity}
            disabled={savingField !== null}
            onconfirm={confirmDormMerge}
            ondismiss={dismissMergePrompt}
          />
        {/if}
      </section>
    {/if}

    {#if !editing && showDormDetails}
      <section class="entity-dorm-details" aria-label="Details and amenities">
        <h3 class="entity-section-heading">Details & amenities</h3>

        {#if dorm.managingOffice}
          <div class="entity-detail-row">
            <Building2 size={14} />
            <div class="entity-detail-row__content">
              <span class="entity-detail-row__label">Managing office</span>
              <span class="entity-detail-row__value">{dorm.managingOffice}</span
              >
            </div>
          </div>
        {/if}

        {#if dorm.contactEmail}
          <div class="entity-detail-row">
            <Mail size={14} />
            <div class="entity-detail-row__content">
              <span class="entity-detail-row__label">Email</span>
              <a
                href="mailto:{dorm.contactEmail}"
                class="entity-detail-row__value entity-detail-row__value--link"
              >
                {dorm.contactEmail}
              </a>
            </div>
          </div>
        {/if}

        {#if contactPhones.length > 0}
          <div class="entity-detail-row">
            <Phone size={14} />
            <div class="entity-detail-row__content">
              <span class="entity-detail-row__label">Phone</span>
              <span class="entity-detail-row__value"
                >{contactPhones.join(", ")}</span
              >
            </div>
          </div>
        {/if}

        {#if amenities.length > 0}
          <div class="entity-tag-block">
            <span class="entity-detail-row__label">Amenities</span>
            <div class="entity-tag-list">
              {#each amenities as amenity}
                <span class="entity-tag-chip">{amenity}</span>
              {/each}
            </div>
          </div>
        {/if}

        {#if dorm.isUpManaged || dorm.facebookLink || (!dorm.isUpManaged && dorm.priceRange)}
          <div class="entity-dorm-details__links">
            {#if dorm.isUpManaged}
              <EntityExternalLink
                href="https://uplbosa.org"
                label="UPLB OSA website"
                ariaLabel="Open UPLB OSA website (opens in new tab)"
              />
            {:else if dorm.priceRange}
              <span class="price-disclaimer">
                <TriangleAlert size={12} />
                Verify price with owner
              </span>
            {/if}
            {#if dorm.facebookLink}
              <EntityExternalLink
                href={dorm.facebookLink}
                label="Facebook"
                ariaLabel="Open {dorm.dormName} Facebook page (opens in new tab)"
              />
            {/if}
          </div>
        {/if}
      </section>
    {/if}
  {:else}
    <div class="no-results">Dorm not found.</div>
  {/if}
</div>

<style>
  @import "./entity-detail.css";
  @import "../editor/entity-editor.css";
  @import "../map-chrome/map-chrome.css";

  /* Each badge only sets its tone; .entity-meta-chip derives border + wash. */
  .gender-badge {
    color: color-mix(in srgb, var(--badge-color) 85%, black);
  }

  .capacity-badge {
    color: hsl(0, 0%, 30%);
  }

  .up-badge {
    color: hsl(5, 53%, 32%);
  }

  .private-badge {
    color: hsl(210, 55%, 36%);
  }

  .price-badge {
    color: hsl(150, 45%, 27%);
  }

  .price-disclaimer {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    font-size: 0.6875rem;
    color: hsl(35, 80%, 45%);
    font-weight: 500;
  }

  .no-results {
    color: #666;
    font-size: 0.875rem;
    text-align: center;
    padding: 1rem 0;
  }
</style>
