<script lang="ts">
  import {
    adminAuthStore,
    additionProposalStore,
    floatingControlPanelStore,
    toastStore,
  } from "@lib/store.svelte";
  import { getAppData } from "@lib/context";
  import {
    resolveSubmitterName,
    publishEntityCreate,
    submitCreateProposal,
    type ProposalCreateType,
  } from "@lib/proposals/client";
  import { instantToCampusWallString } from "@lib/event-time";
  import { slugifySegment } from "@lib/site";

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
  let lat = $state<number | null>(null);
  let lon = $state<number | null>(null);
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

  const pinLabel = $derived(
    lat !== null && lon !== null
      ? `${lat.toFixed(5)}, ${lon.toFixed(5)}`
      : "Not set",
  );

  function resetFields() {
    buildingName = "";
    buildingDirections = "";
    buildingType = "non-admin";
    lat = null;
    lon = null;
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
      const coords = await additionProposalStore.requestMapPin();
      lat = coords.lat;
      lon = coords.lon;
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
          lat: lat ?? undefined,
          lon: lon ?? undefined,
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
          locations:
            lat !== null && lon !== null
              ? [
                  {
                    anchorType: "custom",
                    buildingId: null,
                    dormId: null,
                    label: "Event marker",
                    lat,
                    lon,
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
          lat,
          lon,
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
      if (!name) {
        error = "Enter your name so editors know who suggested this.";
        return;
      }
    }
    if (
      needsPin &&
      (kind === "create_building" || kind === "create_event") &&
      (lat === null || lon === null)
    ) {
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
  class="addition-panel"
  aria-label={isPublish ? "Add to campus map" : "Propose a campus addition"}
>
  <p class="addition-lead">
    {#if isPublish}
      Add a missing building, room, dorm, college, or division. Buildings and
      dorms need a map pin before you create them.
    {:else}
      Missing something on the map? Propose a new building, room, event, or
      other campus entry. Editors review before anything goes live.
    {/if}
  </p>

  <label class="field">
    <span>What to add</span>
    <select
      bind:value={kind}
      onchange={() => {
        resetFields();
      }}
    >
      {#each options as option (option.value)}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
  </label>

  {#if !isPublish && !adminAuthStore.isLoggedIn}
    <label class="field">
      <span>Your name</span>
      <input bind:value={submitterName} maxlength="100" autocomplete="name" />
    </label>
  {/if}

  {#if kind === "create_building"}
    <label class="field">
      <span>Building name</span>
      <input bind:value={buildingName} maxlength="100" />
    </label>
    <label class="field">
      <span>Directions / notes</span>
      <textarea bind:value={buildingDirections} rows="2"></textarea>
    </label>
    <label class="field">
      <span>Type</span>
      <select bind:value={buildingType}>
        <option value="non-admin">Non-admin</option>
        <option value="admin">Admin</option>
      </select>
    </label>
  {:else if kind === "create_event"}
    <label class="field">
      <span>Event title</span>
      <input bind:value={eventTitle} maxlength="200" />
    </label>
    <label class="field">
      <span>Starts</span>
      <input type="datetime-local" bind:value={eventStartsAt} />
    </label>
    <label class="field">
      <span>Ends</span>
      <input type="datetime-local" bind:value={eventEndsAt} />
    </label>
    <label class="field">
      <span>Category</span>
      <select bind:value={eventCategory}>
        <option value="tradition">Tradition</option>
        <option value="fair">Fair</option>
        <option value="ceremony">Ceremony</option>
        <option value="sports">Sports</option>
        <option value="other">Other</option>
      </select>
    </label>
  {:else if kind === "create_dorm"}
    <label class="field">
      <span>Dorm name</span>
      <input bind:value={dormName} maxlength="120" />
    </label>
    <label class="field">
      <span>Gender policy</span>
      <input bind:value={dormGender} maxlength="40" placeholder="e.g. coed" />
    </label>
  {:else if kind === "create_room"}
    <label class="field">
      <span>Room code</span>
      <input bind:value={roomCode} maxlength="80" />
    </label>
    <label class="field">
      <span>Directions (optional)</span>
      <textarea bind:value={roomDirections} rows="2"></textarea>
    </label>
  {:else if kind === "create_college"}
    <label class="field">
      <span>College name</span>
      <input bind:value={collegeName} maxlength="100" />
    </label>
  {:else if kind === "create_division"}
    <label class="field">
      <span>Division name</span>
      <input bind:value={divisionName} maxlength="100" />
    </label>
    <label class="field">
      <span>Parent college</span>
      <select bind:value={divisionCollegeDraft}>
        <option value="">No college</option>
        {#each colleges as college (college.id)}
          <option value={String(college.id)}>{college.collegeName}</option>
        {/each}
      </select>
    </label>
  {/if}

  {#if needsPin}
    <div class="pin-row">
      <span class="pin-label">Map pin: {pinLabel}</span>
      <button type="button" class="pin-btn" onclick={pickOnMap}
        >Pick on map</button
      >
    </div>
  {/if}

  {#if error}
    <p class="error">{error}</p>
  {/if}

  <button type="button" class="submit" disabled={submitting} onclick={submit}>
    {submitting
      ? isPublish
        ? "Creating…"
        : "Submitting…"
      : isPublish
        ? "Create now"
        : "Submit for review"}
  </button>
</section>

<style>
  .addition-panel {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: none;
    overflow: visible;
  }

  .addition-lead {
    margin: 0;
    font-size: 0.75rem;
    line-height: 1.45;
    color: hsl(0, 0%, 32%);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    font-size: 0.6875rem;
    color: hsl(0, 0%, 38%);
  }

  .field input,
  .field select,
  .field textarea {
    font: inherit;
    font-size: 0.75rem;
    border: 1px solid hsl(0, 0%, 85%);
    border-radius: 0.5rem;
    padding: 0.35rem 0.5rem;
  }

  .pin-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.75rem;
  }

  .pin-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: hsl(0, 0%, 28%);
  }

  .pin-btn {
    border: 1px solid hsl(5, 40%, 72%);
    border-radius: 0.5rem;
    background: white;
    color: hsl(5, 53%, 32%);
    cursor: pointer;
    font: inherit;
    font-size: 0.6875rem;
    font-weight: 700;
    padding: 0.35rem 0.5rem;
  }

  .error {
    margin: 0;
    color: hsl(5, 65%, 38%);
    font-size: 0.75rem;
  }

  .submit {
    border: none;
    border-radius: 0.5rem;
    background: hsl(5, 53%, 32%);
    color: white;
    cursor: pointer;
    font: inherit;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.5rem 0.625rem;
  }

  .submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
