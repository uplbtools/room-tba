<script lang="ts">
  import {
    adminAuthStore,
    additionProposalStore,
    floatingControlPanelStore,
    toastStore,
  } from "@lib/store.svelte";
  import { getAppData } from "@lib/context";
  import SubmitterNameField from "./SubmitterNameField.svelte";
  import {
    resolveSubmitterName,
    publishEntityCreate,
    submitCreateProposal,
    getStoredPendingCreateProposal,
    fetchPublicProposalSummary,
    withdrawEntityProposal,
    type ProposalCreateType,
  } from "@lib/proposals/client";
  import { canShowWithdrawProposal } from "@lib/editor/field-action-label";
  import { validateSubmitterName } from "@constants/proposals";
  import { instantToCampusWallString } from "@lib/event-time";
  import { slugifySegment } from "@lib/site";
  import {
    clearSuggestAdditionDraft,
    readSuggestAdditionDraft,
    scheduleSuggestAdditionDraftSave,
  } from "@lib/contributor-drafts";
  import EntityEditorFormField from "@ui/editor/EntityEditorFormField.svelte";
  import EntityEditorSubmitButton from "@ui/editor/EntityEditorSubmitButton.svelte";
  import EntityEditorPinRow from "@ui/editor/EntityEditorPinRow.svelte";
  import EntityEditorMessage from "@ui/editor/EntityEditorMessage.svelte";
  import ImageUpload from "@ui/editor/ImageUpload.svelte";
  import { onMount } from "svelte";

  type AdditionOption = {
    value: ProposalCreateType;
    label: string;
  };

  let {
    mode = "proposal",
    panelId = "suggest-addition",
    onDismiss,
    onRestore,
  }: {
    mode?: "proposal" | "publish";
    panelId?: string;
    onDismiss?: () => void;
    onRestore?: () => void;
  } = $props();

  const PROPOSAL_OPTIONS: AdditionOption[] = [
    { value: "create_building", label: "Building" },
    { value: "create_event", label: "Campus event" },
    { value: "create_dorm", label: "Dorm" },
    { value: "create_room", label: "Room" },
    { value: "create_college", label: "College" },
    { value: "create_division", label: "Division" },
  ];

  const PUBLISH_OPTIONS: AdditionOption[] = [
    { value: "create_building", label: "Building" },
    { value: "create_dorm", label: "Dorm" },
    { value: "create_room", label: "Room" },
    { value: "create_college", label: "College" },
    { value: "create_division", label: "Division" },
  ];

  const options = $derived(
    mode === "publish" ? PUBLISH_OPTIONS : PROPOSAL_OPTIONS,
  );
  const isPublish = $derived(mode === "publish");

  let kind = $state<ProposalCreateType>("create_building");
  let submitterName = $state("");
  let buildingName = $state("");
  let buildingDirections = $state("");
  let buildingType = $state<"admin" | "non-admin">("non-admin");
  let eventTitle = $state("");
  let eventStartsAt = $state("");
  let eventEndsAt = $state("");
  let eventCategory = $state<
    "tradition" | "fair" | "ceremony" | "sports" | "other"
  >("other");
  let eventImageUrl = $state<string | null>(null);
  let dormName = $state("");
  let dormGender = $state("coed");
  let roomCode = $state("");
  let roomDirections = $state("");
  let roomBuildingDraft = $state("");
  let collegeName = $state("");
  let divisionCollegeDraft = $state("");
  let divisionName = $state("");
  let submitting = $state(false);
  let error = $state<string | null>(null);
  let draftReady = $state(false);
  let pendingBuildingLabel = $state<string | null>(null);
  let pendingCreateProposalId = $state<number | null>(null);
  let pendingCreateStatus = $state<string | null>(null);
  let withdrawingCreate = $state(false);

  const appData = getAppData();
  const colleges = $derived(appData().loaded ? appData().colleges : []);
  const buildings = $derived(
    appData().loaded
      ? [...appData().buildings].sort((a, b) =>
          a.buildingName.localeCompare(b.buildingName),
        )
      : [],
  );

  const roomBuildingNotice = $derived.by(() => {
    if (kind !== "create_room" || isPublish) return null;
    if (pendingBuildingLabel) {
      return `Your building suggestion "${pendingBuildingLabel}" is still waiting for editor review. You can add rooms in that building after it is approved and appears on the map.`;
    }
    if (buildings.length === 0) {
      return "Rooms must belong to a building that is already on the map. Suggest a building first, then come back to add rooms after editors approve it.";
    }
    return "Rooms must belong to a building that is already on the map. Pick one below, or open a building in the side panel and use Suggest an edit on an existing room.";
  });

  const needsPin = $derived(
    kind === "create_building" ||
      kind === "create_dorm" ||
      kind === "create_event",
  );

  const draftPin = $derived(additionProposalStore.draftPin);

  function resetFields(clearPin = true) {
    buildingName = "";
    buildingDirections = "";
    buildingType = "non-admin";
    if (clearPin) additionProposalStore.clearDraftPin();
    eventTitle = "";
    eventStartsAt = "";
    eventEndsAt = "";
    eventCategory = "other";
    eventImageUrl = null;
    dormName = "";
    dormGender = "coed";
    roomCode = "";
    roomDirections = "";
    roomBuildingDraft = "";
    collegeName = "";
    divisionCollegeDraft = "";
    divisionName = "";
    error = null;
  }

  function snapshotAdditionDraft() {
    return {
      kind,
      buildingName,
      buildingDirections,
      buildingType,
      eventTitle,
      eventStartsAt,
      eventEndsAt,
      eventCategory,
      eventImageUrl,
      dormName,
      dormGender,
      roomCode,
      roomDirections,
      roomBuildingDraft,
      collegeName,
      divisionCollegeDraft,
      divisionName,
      draftPin: additionProposalStore.draftPin,
    };
  }

  function restoreAdditionDraft() {
    const saved = readSuggestAdditionDraft();
    if (!saved) return;
    kind = saved.kind;
    buildingName = saved.buildingName;
    buildingDirections = saved.buildingDirections;
    buildingType = saved.buildingType;
    eventTitle = saved.eventTitle;
    eventStartsAt = saved.eventStartsAt;
    eventEndsAt = saved.eventEndsAt;
    eventCategory = saved.eventCategory;
    eventImageUrl = saved.eventImageUrl;
    dormName = saved.dormName;
    dormGender = saved.dormGender;
    roomCode = saved.roomCode;
    roomDirections = saved.roomDirections;
    roomBuildingDraft = saved.roomBuildingDraft ?? "";
    collegeName = saved.collegeName;
    divisionCollegeDraft = saved.divisionCollegeDraft;
    divisionName = saved.divisionName;
    if (saved.draftPin) {
      additionProposalStore.setDraftPin(saved.draftPin);
    }
  }

  async function refreshPendingCreateProposal() {
    pendingCreateProposalId = null;
    pendingCreateStatus = null;
    pendingBuildingLabel = null;

    if (isPublish) return;

    const pendingForKind = getStoredPendingCreateProposal(kind);
    if (pendingForKind) {
      pendingCreateProposalId = pendingForKind.id;
      pendingCreateStatus = pendingForKind.status;
    }

    if (kind === "create_room") {
      const pendingBuilding = getStoredPendingCreateProposal("create_building");
      if (!pendingBuilding) return;
      const summary = await fetchPublicProposalSummary(pendingBuilding.id);
      pendingBuildingLabel = summary?.entityLabel ?? "New building";
    }
  }

  async function withdrawPendingCreate() {
    if (!pendingCreateProposalId) return;
    error = null;
    withdrawingCreate = true;
    try {
      const name = resolveSubmitterName({
        displayName: adminAuthStore.displayName,
        username: adminAuthStore.username,
        draftName: submitterName,
      });
      const result = await withdrawEntityProposal({
        proposalId: pendingCreateProposalId,
        submitterName: name || undefined,
      });
      if (!result.ok) {
        error = result.error ?? "Could not withdraw suggestion.";
        return;
      }
      toastStore.show("Suggestion withdrawn.", "success");
      await refreshPendingCreateProposal();
    } finally {
      withdrawingCreate = false;
    }
  }

  onMount(() => {
    if (!isPublish) restoreAdditionDraft();
    draftReady = true;
    void refreshPendingCreateProposal();
  });

  $effect(() => {
    if (isPublish || !draftReady) return;
    kind;
    void refreshPendingCreateProposal();
  });

  $effect(() => {
    if (isPublish || !draftReady || typeof localStorage === "undefined") return;
    kind;
    buildingName;
    buildingDirections;
    buildingType;
    eventTitle;
    eventStartsAt;
    eventEndsAt;
    eventCategory;
    eventImageUrl;
    dormName;
    dormGender;
    roomCode;
    roomDirections;
    roomBuildingDraft;
    collegeName;
    divisionCollegeDraft;
    divisionName;
    additionProposalStore.draftPin;
    scheduleSuggestAdditionDraftSave(snapshotAdditionDraft);
  });

  function dismissHost() {
    if (onDismiss) {
      onDismiss();
      return;
    }
    floatingControlPanelStore.close(panelId);
  }

  function restoreHost() {
    if (onRestore) {
      onRestore();
      return;
    }
    floatingControlPanelStore.openPanel = panelId;
  }

  const pickPinBlockedMessage =
    "You must add all information before picking location on map";

  function blockPickOnMap(message = pickPinBlockedMessage) {
    error = message;
    toastStore.show(message, "error");
  }

  async function pickOnMap() {
    error = null;
    // Require basic identity before dropping a pin so the map interaction has
    // context and the user doesn't place a pin for an empty form (#283).
    if (kind === "create_building" && !buildingName.trim()) {
      blockPickOnMap();
      return;
    }
    if (kind === "create_event" && !eventTitle.trim()) {
      blockPickOnMap();
      return;
    }
    if (kind === "create_dorm" && !dormName.trim()) {
      blockPickOnMap();
      return;
    }
    dismissHost();
    try {
      await additionProposalStore.requestMapPin();
    } catch {
      // cancelled
    } finally {
      restoreHost();
    }
  }

  function campusTimestamp(value: string) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return instantToCampusWallString(date);
  }

  function buildPatch(): Record<string, unknown> {
    switch (kind) {
      case "create_building":
        return {
          buildingName: buildingName.trim(),
          directions: buildingDirections.trim(),
          buildingType,
          lat: draftPin?.lat,
          lon: draftPin?.lon,
        };
      case "create_event": {
        const title = eventTitle.trim();
        return {
          slug: `${slugifySegment(title || "event")}-${Date.now()}`,
          title,
          startsAt: campusTimestamp(eventStartsAt),
          endsAt: campusTimestamp(eventEndsAt),
          category: eventCategory,
          recurrence: "none",
          isActive: true,
          includeInSeo: true,
          imageUrl: eventImageUrl,
          locations: draftPin
            ? [
                {
                  anchorType: "custom",
                  buildingId: null,
                  dormId: null,
                  label: "Event marker",
                  lat: draftPin.lat,
                  lon: draftPin.lon,
                  isPrimary: true,
                  sortOrder: 0,
                },
              ]
            : [],
          routes: [],
        };
      }
      case "create_dorm":
        return {
          dormName: dormName.trim(),
          gender: dormGender.trim(),
          lat: draftPin?.lat ?? null,
          lon: draftPin?.lon ?? null,
        };
      case "create_room":
        return {
          roomCode: roomCode.trim(),
          directions: roomDirections.trim() || null,
          buildingId: Number(roomBuildingDraft),
        };
      case "create_college":
        return { collegeName: collegeName.trim() };
      case "create_division":
        return {
          divisionName: divisionName.trim(),
          collegeId:
            divisionCollegeDraft === "" ? null : Number(divisionCollegeDraft),
        };
    }
  }

  async function submit() {
    error = null;
    if (!isPublish) {
      const name = resolveSubmitterName({
        displayName: adminAuthStore.displayName,
        username: adminAuthStore.username,
        draftName: submitterName,
      });
      const validation = validateSubmitterName(name);
      if (!validation.ok) {
        error = validation.error;
        return;
      }
    }
    if (needsPin && !draftPin) {
      error = "Pick a map location first.";
      return;
    }
    if (kind === "create_building" && !buildingName.trim()) {
      error = "Building name is required.";
      return;
    }
    if (kind === "create_room" && !roomCode.trim()) {
      error = "Room code is required.";
      return;
    }
    if (kind === "create_room") {
      const buildingId = Number(roomBuildingDraft);
      if (!Number.isInteger(buildingId) || buildingId < 1) {
        error = "Pick the building this room belongs to.";
        return;
      }
    }
    if (kind === "create_dorm" && !dormName.trim()) {
      error = "Dorm name is required.";
      return;
    }
    if (kind === "create_college" && !collegeName.trim()) {
      error = "College name is required.";
      return;
    }
    if (kind === "create_division" && !divisionName.trim()) {
      error = "Division name is required.";
      return;
    }

    submitting = true;
    try {
      const patch = buildPatch();
      if (isPublish) {
        const result = await publishEntityCreate(kind, patch);
        if (!result.ok) {
          error = result.error ?? "Could not create entry.";
          return;
        }
        toastStore.show(
          `${options.find((o) => o.value === kind)?.label ?? "Entry"} created.`,
          "success",
        );
        clearSuggestAdditionDraft();
        resetFields();
        dismissHost();
        return;
      }

      const name = resolveSubmitterName({
        displayName: adminAuthStore.displayName,
        username: adminAuthStore.username,
        draftName: submitterName,
      })!;
      const pendingCreate = getStoredPendingCreateProposal(kind);
      const result = await submitCreateProposal({
        entityType: kind,
        patch,
        submitterName: name,
        proposalId:
          pendingCreate?.status === "needs_changes" ? pendingCreate.id : null,
      });
      if (!result.ok) {
        error = result.error ?? "Could not submit proposal.";
        return;
      }
      if (kind === "create_building") {
        toastStore.show(
          "Thanks. We will review your building suggestion soon. You can add rooms in that building after editors approve it.",
          "success",
        );
        await refreshPendingCreateProposal();
      } else {
        toastStore.show("Thanks. We'll review your suggestion soon.", "success");
      }
      clearSuggestAdditionDraft();
      resetFields();
      dismissHost();
    } finally {
      submitting = false;
    }
  }
</script>

<section
  class="entity-editor addition-panel"
  class:contributor-form={!isPublish}
  aria-label={isPublish ? "Add to campus map" : "Propose a campus addition"}
>
  <p class="entity-editor-lead">
    {#if isPublish}
      Add a missing building, room, dorm, college, or division. Buildings and
      dorms need a map pin before you create them.
    {:else}
      Spot something missing on the map? Describe it below. Editors review every
      suggestion before it goes live.
    {/if}
  </p>

  <EntityEditorFormField
    label="What are you adding?"
    inputId="addition-kind-select"
  >
    {#snippet control()}
      <select
        id="addition-kind-select"
        bind:value={kind}
        onchange={() => {
          resetFields();
        }}
      >
        {#each options as option (option.value)}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    {/snippet}
  </EntityEditorFormField>

  {#if !isPublish && !adminAuthStore.isLoggedIn}
    <SubmitterNameField
      id="suggest-addition-submitter-name"
      bind:value={submitterName}
    />
  {/if}

  <div class="field-group">
    {#if kind === "create_building"}
      <EntityEditorFormField
        label="What's it called?"
        inputId="addition-building-name"
        hint="The name people use on campus."
      >
        {#snippet control()}
          <input
            id="addition-building-name"
            bind:value={buildingName}
            maxlength="100"
            placeholder="e.g. Gonzaga Hall"
          />
        {/snippet}
      </EntityEditorFormField>
      <EntityEditorFormField
        label="How do you find it?"
        inputId="addition-building-directions"
        hint="Floor, nearby landmarks, or anything that helps someone get there."
      >
        {#snippet control()}
          <textarea
            id="addition-building-directions"
            bind:value={buildingDirections}
            rows="2"
            placeholder="Near the main entrance, past the lobby…"></textarea>
        {/snippet}
      </EntityEditorFormField>
      <EntityEditorFormField
        label="Who uses this building?"
        inputId="addition-building-type"
      >
        {#snippet control()}
          <select id="addition-building-type" bind:value={buildingType}>
            <option value="non-admin">Student-facing</option>
            <option value="admin">Admin / offices</option>
          </select>
        {/snippet}
      </EntityEditorFormField>
    {:else if kind === "create_event"}
      <EntityEditorFormField
        label="What's the event called?"
        inputId="addition-event-title"
      >
        {#snippet control()}
          <input
            id="addition-event-title"
            bind:value={eventTitle}
            maxlength="200"
            placeholder="e.g. Lantern Parade"
          />
        {/snippet}
      </EntityEditorFormField>
      <EntityEditorFormField
        label="When does it start?"
        inputId="addition-event-starts"
      >
        {#snippet control()}
          <input
            id="addition-event-starts"
            type="datetime-local"
            bind:value={eventStartsAt}
          />
        {/snippet}
      </EntityEditorFormField>
      <EntityEditorFormField
        label="When does it wrap up?"
        inputId="addition-event-ends"
      >
        {#snippet control()}
          <input
            id="addition-event-ends"
            type="datetime-local"
            bind:value={eventEndsAt}
          />
        {/snippet}
      </EntityEditorFormField>
      <EntityEditorFormField
        label="What kind of event?"
        inputId="addition-event-category"
      >
        {#snippet control()}
          <select id="addition-event-category" bind:value={eventCategory}>
            <option value="tradition">Tradition</option>
            <option value="fair">Fair</option>
            <option value="ceremony">Ceremony</option>
            <option value="sports">Sports</option>
            <option value="other">Other</option>
          </select>
        {/snippet}
      </EntityEditorFormField>
      {#if adminAuthStore.isLoggedIn}
        <ImageUpload
          inputId="addition-event-image"
          label="Event image (optional)"
          prefix={`events/${slugifySegment(eventTitle.trim() || "event")}`}
          bind:value={eventImageUrl}
          disabled={submitting}
        />
      {/if}
    {:else if kind === "create_dorm"}
      <EntityEditorFormField
        label="What's the dorm called?"
        inputId="addition-dorm-name"
      >
        {#snippet control()}
          <input
            id="addition-dorm-name"
            bind:value={dormName}
            maxlength="120"
            placeholder="e.g. Eliazo Hall"
          />
        {/snippet}
      </EntityEditorFormField>
      <EntityEditorFormField
        label="Who can live here?"
        inputId="addition-dorm-gender"
        hint="Coed, women only, men only, or whatever applies."
      >
        {#snippet control()}
          <input
            id="addition-dorm-gender"
            bind:value={dormGender}
            maxlength="40"
            placeholder="e.g. coed"
          />
        {/snippet}
      </EntityEditorFormField>
    {:else if kind === "create_room"}
      {#if roomBuildingNotice}
        <EntityEditorMessage variant="pending" message={roomBuildingNotice} />
      {/if}
      <EntityEditorFormField
        label="Which building is it in?"
        inputId="addition-room-building"
        hint="Only buildings already on the map appear here."
      >
        {#snippet control()}
          <select
            id="addition-room-building"
            bind:value={roomBuildingDraft}
            disabled={buildings.length === 0}
          >
            <option value="">
              {buildings.length === 0
                ? "No buildings on the map yet"
                : "Select a building"}
            </option>
            {#each buildings as building (building.id)}
              <option value={String(building.id)}>{building.buildingName}</option>
            {/each}
          </select>
        {/snippet}
      </EntityEditorFormField>
      <EntityEditorFormField
        label="Room number or code"
        inputId="addition-room-code"
        hint="As you'd tell a friend where to meet."
      >
        {#snippet control()}
          <input
            id="addition-room-code"
            bind:value={roomCode}
            maxlength="80"
            placeholder="e.g. 301 or A-12"
          />
        {/snippet}
      </EntityEditorFormField>
      <EntityEditorFormField
        label="How do you get there?"
        inputId="addition-room-directions"
        hint="Optional: stairs, wing, or landmarks."
      >
        {#snippet control()}
          <textarea
            id="addition-room-directions"
            bind:value={roomDirections}
            rows="2"
            placeholder="Third floor, left wing…"></textarea>
        {/snippet}
      </EntityEditorFormField>
    {:else if kind === "create_college"}
      <EntityEditorFormField
        label="College name"
        inputId="addition-college-name"
        hint="The official name as students know it."
      >
        {#snippet control()}
          <input
            id="addition-college-name"
            bind:value={collegeName}
            maxlength="100"
            placeholder="e.g. College of Science"
          />
        {/snippet}
      </EntityEditorFormField>
    {:else if kind === "create_division"}
      <EntityEditorFormField
        label="Division name"
        inputId="addition-division-name"
      >
        {#snippet control()}
          <input
            id="addition-division-name"
            bind:value={divisionName}
            maxlength="100"
            placeholder="e.g. Department of Physics"
          />
        {/snippet}
      </EntityEditorFormField>
      <EntityEditorFormField
        label="Part of which college?"
        inputId="addition-division-college"
      >
        {#snippet control()}
          <select
            id="addition-division-college"
            bind:value={divisionCollegeDraft}
          >
            <option value="">No college</option>
            {#each colleges as college (college.id)}
              <option value={String(college.id)}>{college.collegeName}</option>
            {/each}
          </select>
        {/snippet}
      </EntityEditorFormField>
    {/if}
  </div>

  {#if needsPin}
    <EntityEditorPinRow
      label={draftPin
        ? `Pin set · ${draftPin.lat.toFixed(5)}, ${draftPin.lon.toFixed(5)}`
        : "Drop a pin on the map"}
      pickLabel={draftPin ? "Move pin" : "Pick on map"}
      disabled={submitting}
      onclick={pickOnMap}
    />
  {/if}

  {#if error}
    <EntityEditorMessage variant="error" message={error} />
  {/if}

  {#if !isPublish && pendingCreateProposalId && canShowWithdrawProposal(pendingCreateStatus)}
    <div class="entity-editor-form-actions">
      <EntityEditorSubmitButton
        label="Withdraw pending suggestion"
        savingLabel="Withdrawing…"
        saving={withdrawingCreate}
        variant="secondary"
        onclick={withdrawPendingCreate}
      />
    </div>
  {/if}

  <EntityEditorSubmitButton
    label={isPublish ? "Create now" : "Send suggestion"}
    savingLabel={isPublish ? "Creating…" : "Sending…"}
    saving={submitting}
    variant="primary"
    onclick={submit}
  />
</section>

<style>
  @import "./editor/entity-editor.css";

  .addition-panel {
    max-height: none;
    overflow: visible;
  }
</style>
