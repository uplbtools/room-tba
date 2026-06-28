<script lang="ts">
  import {
    adminAuthStore,
    additionProposalStore,
    floatingControlPanelStore,
    toastStore,
  } from "../../lib/store.svelte";
  import { getAppData } from "../../lib/context";
  import SubmitterNameField from "./SubmitterNameField.svelte";
  import {
    resolveSubmitterName,
    publishEntityCreate,
    submitCreateProposal,
    type ProposalCreateType,
  } from "../../lib/proposals/client";
  import { validateSubmitterName } from "../../constants/proposals";
  import { instantToCampusWallString } from "../../lib/event-time";
  import { slugifySegment } from "../../lib/site";
  import EntityEditorFormField from "./editor/EntityEditorFormField.svelte";
  import EntityEditorSubmitButton from "./editor/EntityEditorSubmitButton.svelte";
  import EntityEditorPinRow from "./editor/EntityEditorPinRow.svelte";
  import EntityEditorMessage from "./editor/EntityEditorMessage.svelte";

  type AdditionOption = {
    value: ProposalCreateType;
    label: string;
  };

  let {
    mode = "proposal",
    panelId = "suggest-addition",
  }: {
    mode?: "proposal" | "publish";
    panelId?: string;
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
  let dormName = $state("");
  let dormGender = $state("coed");
  let roomCode = $state("");
  let roomDirections = $state("");
  let collegeName = $state("");
  let divisionCollegeDraft = $state("");
  let divisionName = $state("");
  let submitting = $state(false);
  let error = $state<string | null>(null);

  const appData = getAppData();
  const colleges = $derived(appData().loaded ? appData().colleges : []);

  const needsPin = $derived(
    kind === "create_building" ||
      kind === "create_dorm" ||
      kind === "create_event",
  );

  const draftPin = $derived(additionProposalStore.draftPin);

  const pinLabel = $derived(
    draftPin
      ? `${draftPin.lat.toFixed(5)}, ${draftPin.lon.toFixed(5)}`
      : "Not set",
  );

  function resetFields() {
    buildingName = "";
    buildingDirections = "";
    buildingType = "non-admin";
    additionProposalStore.clearDraftPin();
    eventTitle = "";
    eventStartsAt = "";
    eventEndsAt = "";
    eventCategory = "other";
    dormName = "";
    dormGender = "coed";
    roomCode = "";
    roomDirections = "";
    collegeName = "";
    divisionCollegeDraft = "";
    divisionName = "";
    error = null;
  }

  async function pickOnMap() {
    error = null;
    floatingControlPanelStore.close(panelId);
    try {
      await additionProposalStore.requestMapPin();
    } catch {
      // cancelled
    } finally {
      floatingControlPanelStore.openPanel = panelId;
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
        resetFields();
        floatingControlPanelStore.close(panelId);
        return;
      }

      const name = resolveSubmitterName({
        displayName: adminAuthStore.displayName,
        username: adminAuthStore.username,
        draftName: submitterName,
      })!;
      const result = await submitCreateProposal({
        entityType: kind,
        patch,
        submitterName: name,
      });
      if (!result.ok) {
        error = result.error ?? "Could not submit proposal.";
        return;
      }
      toastStore.show("Addition submitted for editor review.", "success");
      resetFields();
      floatingControlPanelStore.close(panelId);
    } finally {
      submitting = false;
    }
  }
</script>

<section
  class="entity-editor addition-panel"
  aria-label={isPublish ? "Add to campus map" : "Propose a campus addition"}
>
  <p class="entity-editor-lead">
    {#if isPublish}
      Add a missing building, room, dorm, college, or division. Buildings and
      dorms need a map pin before you create them.
    {:else}
      Missing something on the map? Propose a new building, room, event, or
      other campus entry. Editors review before anything goes live.
    {/if}
  </p>

  <EntityEditorFormField label="What to add" inputId="addition-kind-select">
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

  {#if kind === "create_building"}
    <EntityEditorFormField label="Building name" inputId="addition-building-name">
      {#snippet control()}
        <input
          id="addition-building-name"
          bind:value={buildingName}
          maxlength="100"
        />
      {/snippet}
    </EntityEditorFormField>
    <EntityEditorFormField
      label="Directions / notes"
      inputId="addition-building-directions"
    >
      {#snippet control()}
        <textarea
          id="addition-building-directions"
          bind:value={buildingDirections}
          rows="2"
        ></textarea>
      {/snippet}
    </EntityEditorFormField>
    <EntityEditorFormField label="Type" inputId="addition-building-type">
      {#snippet control()}
        <select id="addition-building-type" bind:value={buildingType}>
          <option value="non-admin">Non-admin</option>
          <option value="admin">Admin</option>
        </select>
      {/snippet}
    </EntityEditorFormField>
  {:else if kind === "create_event"}
    <EntityEditorFormField label="Event title" inputId="addition-event-title">
      {#snippet control()}
        <input id="addition-event-title" bind:value={eventTitle} maxlength="200" />
      {/snippet}
    </EntityEditorFormField>
    <EntityEditorFormField label="Starts" inputId="addition-event-starts">
      {#snippet control()}
        <input
          id="addition-event-starts"
          type="datetime-local"
          bind:value={eventStartsAt}
        />
      {/snippet}
    </EntityEditorFormField>
    <EntityEditorFormField label="Ends" inputId="addition-event-ends">
      {#snippet control()}
        <input
          id="addition-event-ends"
          type="datetime-local"
          bind:value={eventEndsAt}
        />
      {/snippet}
    </EntityEditorFormField>
    <EntityEditorFormField label="Category" inputId="addition-event-category">
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
  {:else if kind === "create_dorm"}
    <EntityEditorFormField label="Dorm name" inputId="addition-dorm-name">
      {#snippet control()}
        <input id="addition-dorm-name" bind:value={dormName} maxlength="120" />
      {/snippet}
    </EntityEditorFormField>
    <EntityEditorFormField label="Gender policy" inputId="addition-dorm-gender">
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
    <EntityEditorFormField label="Room code" inputId="addition-room-code">
      {#snippet control()}
        <input id="addition-room-code" bind:value={roomCode} maxlength="80" />
      {/snippet}
    </EntityEditorFormField>
    <EntityEditorFormField
      label="Directions (optional)"
      inputId="addition-room-directions"
    >
      {#snippet control()}
        <textarea
          id="addition-room-directions"
          bind:value={roomDirections}
          rows="2"
        ></textarea>
      {/snippet}
    </EntityEditorFormField>
  {:else if kind === "create_college"}
    <EntityEditorFormField label="College name" inputId="addition-college-name">
      {#snippet control()}
        <input
          id="addition-college-name"
          bind:value={collegeName}
          maxlength="100"
        />
      {/snippet}
    </EntityEditorFormField>
  {:else if kind === "create_division"}
    <EntityEditorFormField label="Division name" inputId="addition-division-name">
      {#snippet control()}
        <input
          id="addition-division-name"
          bind:value={divisionName}
          maxlength="100"
        />
      {/snippet}
    </EntityEditorFormField>
    <EntityEditorFormField
      label="Parent college"
      inputId="addition-division-college"
    >
      {#snippet control()}
        <select id="addition-division-college" bind:value={divisionCollegeDraft}>
          <option value="">No college</option>
          {#each colleges as college (college.id)}
            <option value={String(college.id)}>{college.collegeName}</option>
          {/each}
        </select>
      {/snippet}
    </EntityEditorFormField>
  {/if}

  {#if needsPin}
    <EntityEditorPinRow
      label="Map pin: {pinLabel}"
      disabled={submitting}
      onclick={pickOnMap}
    />
  {/if}

  {#if error}
    <EntityEditorMessage variant="error" message={error} />
  {/if}

  <EntityEditorSubmitButton
    label={isPublish ? "Create now" : "Submit for review"}
    savingLabel={isPublish ? "Creating…" : "Submitting…"}
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
