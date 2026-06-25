<script lang="ts">
  import {
    adminAuthStore,
    currentRoom,
    locationStore,
    modalStore,
    queryStore,
  } from "../../../lib/store.svelte";
  import { getAppData } from "../../../lib/context";
  import CornerRightUp from "@lucide/svelte/icons/corner-right-up";
  import type { RoomData } from "../../../lib/types";
  // import Classes from "./Classes.svelte";

  type RoomEditableField =
    | "roomCode"
    | "directions"
    | "buildingId"
    | "collegeId"
    | "divisionId";

  type RoomPatchResponse = {
    success?: boolean;
    room?: RoomData;
    latest?: RoomData | null;
    error?: string;
  };

  const appData = getAppData();
  const app = $derived(appData());
  const buildings = $derived(app.loaded ? app.buildings : []);
  const colleges = $derived(app.loaded ? app.colleges : []);
  const divisions = $derived(app.loaded ? app.divisions : []);

  const fieldLabels: Record<RoomEditableField, string> = {
    roomCode: "Room code",
    directions: "Room directions",
    buildingId: "Building",
    collegeId: "College",
    divisionId: "Division",
  };

  let draftRoomId = $state<number | null>(null);
  let draftVersion = $state<number | null>(null);
  let codeDraft = $state("");
  let directionsDraft = $state("");
  let buildingDraft = $state("");
  let collegeDraft = $state("");
  let divisionDraft = $state("");
  let savingField = $state<RoomEditableField | null>(null);
  let savedField = $state<RoomEditableField | null>(null);
  let fieldError = $state<string | null>(null);

  $effect(() => {
    const room = currentRoom.value;
    if (!room) return;
    if (draftRoomId === room.id && draftVersion === room.version) return;

    draftRoomId = room.id;
    draftVersion = room.version;
    codeDraft = room.code;
    directionsDraft = room.directions ?? "";
    buildingDraft = room.buildingId === null ? "" : String(room.buildingId);
    collegeDraft = room.collegeId === null ? "" : String(room.collegeId);
    divisionDraft = room.divisionId === null ? "" : String(room.divisionId);
    savedField = null;
    fieldError = null;
  });

  function fieldLabel(field: RoomEditableField) {
    return fieldLabels[field];
  }

  function selectValueToId(value: string) {
    return value === "" ? null : Number(value);
  }

  function syncRoomFromServer(room: RoomData) {
    currentRoom.setRoom(room);
    queryStore.hydrateQuery({
      type: "result",
      category: "room",
      value: room.code,
    });
  }

  async function saveField(field: RoomEditableField) {
    const room = currentRoom.value;
    if (!room) return;

    const body: {
      version: number;
      roomCode?: string;
      directions?: string | null;
      buildingId?: number | null;
      collegeId?: number | null;
      divisionId?: number | null;
    } = { version: room.version };

    if (field === "roomCode") {
      const trimmedCode = codeDraft.trim();
      if (trimmedCode.length === 0) {
        fieldError = `${room.code} room code cannot be empty.`;
        return;
      }
      body.roomCode = trimmedCode;
    } else if (field === "directions") {
      body.directions = directionsDraft.trim() || null;
    } else if (field === "buildingId") {
      body.buildingId = selectValueToId(buildingDraft);
    } else if (field === "collegeId") {
      body.collegeId = selectValueToId(collegeDraft);
    } else if (field === "divisionId") {
      body.divisionId = selectValueToId(divisionDraft);
    }

    savingField = field;
    savedField = null;
    fieldError = null;

    try {
      const res = await fetch(`/api/admin/rooms/${room.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as RoomPatchResponse;

      if (!res.ok) {
        if (res.status === 409 && data.latest) {
          syncRoomFromServer(data.latest);
          fieldError = `${room.code} ${fieldLabel(field)} was not saved because the server has newer data. Showing the latest saved room.`;
          return;
        }

        fieldError = `${room.code} ${fieldLabel(field)} failed to save: ${data.error ?? `Save failed (${res.status})`}`;
        return;
      }

      if (data.room) syncRoomFromServer(data.room);
      savedField = field;
      setTimeout(() => {
        if (savedField === field) savedField = null;
      }, 1800);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Network error";
      fieldError = `${room.code} ${fieldLabel(field)} failed to save: ${reason}`;
    } finally {
      savingField = null;
    }
  }

  function openBuildingResult() {
    const buildingName = currentRoom.value?.building?.name;
    if (!buildingName) return;
    queryStore.updateQuery({
      type: "result",
      category: "building",
      value: buildingName,
    });
  }
</script>

<div class="room-details-container">
  {#if currentRoom.value}
    <div class="header-section">
      <div class="header-top-row">
        <h2>{currentRoom.value.code}</h2>
      </div>
      <div class="subtitle-badge">
        <p>
          {#if currentRoom.value.collegeName}
            {currentRoom.value.collegeName}
          {/if}
          {#if currentRoom.value.building?.name}
            {#if currentRoom.value.collegeName}
              •
            {/if}
            {currentRoom.value.building.name}
          {/if}
        </p>
      </div>
    </div>

    {#if adminAuthStore.isAdmin}
      <section class="room-editor" aria-label="Edit room details">
        <div class="editor-heading">
          <span>Editor</span>
          <small>v{currentRoom.value.version}</small>
        </div>

        <div class="editor-field">
          <label for="room-code-editor">Room code</label>
          <div class="editor-control-row">
            <input
              id="room-code-editor"
              bind:value={codeDraft}
              disabled={savingField !== null}
              autocomplete="off"
            />
            <button
              class="field-save-btn"
              disabled={savingField !== null ||
                codeDraft.trim() === currentRoom.value.code}
              onclick={() => saveField("roomCode")}
            >
              {savingField === "roomCode" ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        <div class="editor-field">
          <label for="room-directions-editor">Room directions</label>
          <div class="editor-control-row stacked">
            <textarea
              id="room-directions-editor"
              bind:value={directionsDraft}
              disabled={savingField !== null}
              rows="3"></textarea>
            <button
              class="field-save-btn"
              disabled={savingField !== null ||
                directionsDraft.trim() === (currentRoom.value.directions ?? "")}
              onclick={() => saveField("directions")}
            >
              {savingField === "directions" ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        <div class="editor-grid">
          <div class="editor-field">
            <label for="room-building-editor">Building</label>
            <div class="editor-control-row">
              <select
                id="room-building-editor"
                bind:value={buildingDraft}
                disabled={savingField !== null}
              >
                <option value="">No building</option>
                {#each buildings as building (building.id)}
                  <option value={String(building.id)}
                    >{building.buildingName}</option
                  >
                {/each}
              </select>
              <button
                class="field-save-btn"
                disabled={savingField !== null ||
                  buildingDraft === String(currentRoom.value.buildingId ?? "")}
                onclick={() => saveField("buildingId")}
              >
                {savingField === "buildingId" ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          <div class="editor-field">
            <label for="room-college-editor">College</label>
            <div class="editor-control-row">
              <select
                id="room-college-editor"
                bind:value={collegeDraft}
                disabled={savingField !== null}
              >
                <option value="">No college</option>
                {#each colleges as college (college.id)}
                  <option value={String(college.id)}
                    >{college.collegeName}</option
                  >
                {/each}
              </select>
              <button
                class="field-save-btn"
                disabled={savingField !== null ||
                  collegeDraft === String(currentRoom.value.collegeId ?? "")}
                onclick={() => saveField("collegeId")}
              >
                {savingField === "collegeId" ? "Saving..." : "Save"}
              </button>
            </div>
          </div>

          <div class="editor-field">
            <label for="room-division-editor">Division</label>
            <div class="editor-control-row">
              <select
                id="room-division-editor"
                bind:value={divisionDraft}
                disabled={savingField !== null}
              >
                <option value="">No division</option>
                {#each divisions as division (division.id)}
                  <option value={String(division.id)}
                    >{division.divisionName}</option
                  >
                {/each}
              </select>
              <button
                class="field-save-btn"
                disabled={savingField !== null ||
                  divisionDraft === String(currentRoom.value.divisionId ?? "")}
                onclick={() => saveField("divisionId")}
              >
                {savingField === "divisionId" ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>

        {#if savedField}
          <p class="editor-message success">{fieldLabel(savedField)} saved.</p>
        {/if}
        {#if fieldError}
          <p class="editor-message error">{fieldError}</p>
        {/if}
      </section>
    {/if}

    {#if currentRoom.value.directions}
      <p class="room-directions">
        {currentRoom.value.directions}
      </p>
    {:else}
      <p class="room-directions no-directions">
        No directions? <a
          href="https://docs.google.com/forms/d/e/1FAIpQLSdius5C7OyC1klraq71fFwWPZNvNk_iDLFyhCNir_ccC07Q7Q/viewform?usp=dialog"
          target="_blank"
          rel="noreferrer"><strong>Contribute to room-tba</strong></a
        >
      </p>
    {/if}

    {#if currentRoom.value.building}
      <div class="building-note">
        <h3 class="building-note-title">
          How to get to {currentRoom.value.building.name}
        </h3>
        {#if currentRoom.value.building.directions}
          <p class="building-directions">
            {currentRoom.value.building.directions}
          </p>
        {:else}
          <p class="building-directions no-directions">
            No directions? <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSdius5C7OyC1klraq71fFwWPZNvNk_iDLFyhCNir_ccC07Q7Q/viewform?usp=dialog"
              target="_blank"
              rel="noreferrer"><strong>Contribute to room-tba</strong></a
            >
          </p>
        {/if}
      </div>
    {/if}

    {#if currentRoom.value.building?.name}
      <div class="map-links">
        <button class="view-building-btn" onclick={openBuildingResult}>
          View building
        </button>
        {#if currentRoom.value.building.lat && currentRoom.value.building.lon}
          <button
            class="get-directions-btn"
            onclick={() => {
              if (
                currentRoom.value &&
                currentRoom.value.building &&
                currentRoom.value.building.lon &&
                currentRoom.value.building.lat
              ) {
                locationStore.requestLocation();
                locationStore.setDestination([
                  currentRoom.value.building.lon,
                  currentRoom.value.building.lat,
                ]);
              }
            }}
          >
            Get Directions
            <CornerRightUp size={18} />
          </button>
          <a
            href="https://www.google.com/maps?q={currentRoom.value.building
              .lat},{currentRoom.value.building.lon}"
            target="_blank"
            rel="noreferrer"
          >
            Open in Google Maps
          </a>
        {/if}
      </div>
    {/if}
    <hr />

    <div class="schedule-section">
      <div class="schedule-section__header">
        <h3>Classes in this room</h3>
        <button
          onclick={() => modalStore.openModal("schedule-expand")}
          class="schedule-section__opener"
          >Open schedule <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            ><line x1="7" y1="17" x2="17" y2="7"></line><polyline
              points="7 7 17 7 17 17"
            ></polyline></svg
          ></button
        >
      </div>
      <!-- <Classes classes={classesData} /> -->
    </div>
  {:else}
    <p>Room not found.</p>
  {/if}
</div>

<style>
  hr {
    margin-block: 0;
  }
  .room-details-container {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    overflow-y: auto;
    width: 100%;
    flex: 1 1 0;
  }

  .header-section {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    align-items: flex-start;
    width: 100%;
  }

  .header-top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .header-section h2 {
    font-weight: bold;
    font-size: 1.125rem;
    line-height: 1.25rem;
    color: black;
    margin: 0;
  }

  .subtitle-badge {
    background-color: #ececec;
    border-radius: 0.4375rem;
    padding: 2px 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .subtitle-badge p {
    font-weight: normal;
    font-size: 0.75rem;
    color: #4f4f4f;
    margin: 0;
  }

  .room-editor {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.625rem;
    border: 1px solid hsl(5, 53%, 88%);
    border-radius: 0.625rem;
    background-color: hsl(5, 53%, 98%);
  }

  .editor-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;
    color: hsl(5, 53%, 32%);
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .editor-heading small {
    color: #777;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: none;
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
    border-radius: 0.375rem;
    padding: 0.375rem 0.5rem;
    color: #222;
    font: inherit;
    font-size: 0.8125rem;
    background-color: white;
  }

  .editor-control-row textarea {
    resize: vertical;
  }

  .field-save-btn {
    border: none;
    border-radius: 0.375rem;
    padding: 0.375rem 0.625rem;
    background-color: hsl(5, 53%, 32%);
    color: white;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
  }

  .field-save-btn:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .editor-message {
    margin: 0;
    font-size: 0.75rem;
    line-height: 1.4;
  }

  .editor-message.success {
    color: hsl(145, 55%, 30%);
  }

  .editor-message.error {
    color: hsl(5, 53%, 32%);
    font-weight: 600;
  }

  .room-directions {
    font-size: 0.875rem;
    line-height: 1.5;
    color: #4f4f4f;
    margin: 0;
  }

  .building-note {
    padding: 0.75rem 1rem;
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
    border-left: 4px solid hsl(5, 53%, 32%);
    background-color: hsla(5, 53%, 89%, 0.5);
  }

  .building-note-title {
    font-weight: 600;
    font-size: 1rem;
    margin: 0 0 0.25rem 0;
    color: black;
  }

  .building-directions {
    font-size: 0.875rem;
    line-height: 1.5;
    color: #4f4f4f;
    margin: 0;
  }

  .no-directions {
    color: hsl(0, 0%, 60%);
  }

  .no-directions a {
    color: hsl(5, 53%, 32%);
    outline: none;
    transition: all 0.2s;
    padding: 0.125rem 0.25rem;
    border-radius: 4px;
  }

  .no-directions a:hover,
  .no-directions a:focus-visible {
    background-color: hsl(5, 53%, 32%);
    color: white;
    text-decoration: none;
  }

  .schedule-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    .schedule-section__header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      button.schedule-section__opener {
        all: unset;
        font-size: 0.875rem;
        font-weight: 600;
        padding: 0.25rem 1rem;
        background-color: hsl(5, 53%, 32%);
        color: white;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        gap: 0.25rem;
        align-items: center;
      }
    }
  }

  .schedule-section h3 {
    font-weight: 600;
    font-size: 1rem;
    line-height: 1.25rem;
    color: black;
    margin: 0;
  }

  .map-links {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .map-links a {
    color: hsl(5, 53%, 32%);
    outline: none;
    transition: all 0.2s;
    font-size: 0.875rem;
    padding: 0.25rem 0.5rem;
    border: 1px solid hsl(5, 53%, 32%);
    border-radius: 4px;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
  }
  .map-links a:hover,
  .map-links a:focus-visible {
    background-color: hsl(5, 53%, 32%);
    color: white;
  }

  .view-building-btn {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.5rem;
    color: hsl(5, 53%, 32%);
    background-color: white;
    border: 1px solid hsl(5, 53%, 75%);
    border-radius: 4px;
    font-size: 0.875rem;
    cursor: pointer;
  }

  .view-building-btn:hover,
  .view-building-btn:focus-visible {
    background-color: hsl(5, 53%, 95%);
  }

  .get-directions-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.75rem;
    background-color: hsl(5, 53%, 32%);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .get-directions-btn:hover {
    background-color: hsl(5, 53%, 40%);
  }
</style>
