<script lang="ts">
  import { onMount } from "svelte";
  import MegaphoneOff from "@lucide/svelte/icons/megaphone-off";
  import { adminAuthStore, announcementsStore } from "@lib/store.svelte";
  import { FACEBOOK_URL } from "@constants/community-links";
  import ModalHeader from "./ModalHeader.svelte";
  import CommunityPlatformLink from "@ui/community/CommunityPlatformLink.svelte";
  import {
    ANNOUNCEMENT_SEVERITIES,
    ANNOUNCEMENT_SEVERITY_LABELS,
    type AnnouncementSeverity,
  } from "@constants/announcement-severities";
  import {
    isPublished,
    relativeDateLabel,
    sortNewestFirst,
  } from "@lib/announcements";
  import {
    campusInputToWallString,
    campusWallTimeToInstant,
    formatCampusDateTime,
    instantToCampusInput,
  } from "@lib/event-time";
  import type { AnnouncementData } from "@lib/types";

  const canPublish = $derived(adminAuthStore.canPublish);

  /** Editors manage every row; everyone else sees only what is live. */
  let editorRows = $state.raw<AnnouncementData[]>([]);
  let editorError = $state<string | null>(null);
  let saving = $state(false);

  const rows = $derived(
    canPublish ? sortNewestFirst(editorRows) : announcementsStore.items,
  );

  type Draft = {
    id: number | null;
    version: number;
    title: string;
    body: string;
    severity: AnnouncementSeverity;
    startsOn: string;
    endsOn: string;
    linkUrl: string;
  };

  let draft = $state<Draft | null>(null);

  onMount(() => {
    // Opening the panel is what clears the badge (#777).
    announcementsStore.markSeen();
    if (canPublish) void loadEditorRows();
  });

  async function loadEditorRows() {
    try {
      const res = await fetch("/api/admin/announcements", {
        credentials: "same-origin",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { announcements?: AnnouncementData[] };
      editorRows = data.announcements ?? [];
    } catch {
      // Offline editor: the public list still renders from cache.
    }
  }

  function newDraft() {
    draft = {
      id: null,
      version: 0,
      title: "",
      body: "",
      severity: "info",
      startsOn: instantToCampusInput(new Date()),
      endsOn: "",
      linkUrl: "",
    };
    editorError = null;
  }

  function editDraft(row: AnnouncementData) {
    draft = {
      id: row.id,
      version: row.version,
      title: row.title,
      body: row.body,
      severity: (row.severity as AnnouncementSeverity) ?? "info",
      startsOn: instantToCampusInput(row.startsOn),
      endsOn: row.endsOn ? instantToCampusInput(row.endsOn) : "",
      linkUrl: row.linkUrl ?? "",
    };
    editorError = null;
  }

  async function save() {
    if (!draft) return;
    if (!draft.title.trim() || !draft.body.trim()) {
      editorError = "Title and body are required.";
      return;
    }
    saving = true;
    editorError = null;
    const payload = {
      title: draft.title.trim(),
      body: draft.body.trim(),
      severity: draft.severity,
      startsOn: campusInputToWallString(draft.startsOn),
      endsOn: draft.endsOn ? campusInputToWallString(draft.endsOn) : null,
      linkUrl: draft.linkUrl.trim() || null,
      ...(draft.id === null ? {} : { version: draft.version }),
    };
    try {
      const res = await fetch(
        draft.id === null
          ? "/api/admin/announcements"
          : `/api/admin/announcements/${draft.id}`,
        {
          method: draft.id === null ? "POST" : "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        editorError = data.error ?? "Could not save the announcement.";
        return;
      }
      draft = null;
      await Promise.all([loadEditorRows(), announcementsStore.load()]);
    } catch {
      editorError = "Network error. Try again.";
    } finally {
      saving = false;
    }
  }

  async function remove(row: AnnouncementData) {
    if (!confirm(`Delete "${row.title}"?`)) return;
    saving = true;
    editorError = null;
    try {
      const res = await fetch(`/api/admin/announcements/${row.id}`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: row.version }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        editorError = data.error ?? "Could not delete the announcement.";
        return;
      }
      await Promise.all([loadEditorRows(), announcementsStore.load()]);
    } catch {
      editorError = "Network error. Try again.";
    } finally {
      saving = false;
    }
  }

  /** Editors also see rows outside the window; label why they are not live. */
  function statusLabel(row: AnnouncementData): string | null {
    if (isPublished(row)) return null;
    return campusWallTimeToInstant(row.startsOn) > new Date()
      ? "Scheduled"
      : "Expired";
  }
</script>

<div class="announcements">
  <ModalHeader
    id="announcements-modal-title"
    title="Announcements"
    description="Campus and app notices from the Room TBA team."
  >
    {#snippet trailing()}
      {#if canPublish}
        <button
          type="button"
          class="announcements__btn announcements__btn--primary"
          aria-label="New announcement"
          onclick={newDraft}
        >
          New
        </button>
      {/if}
    {/snippet}
  </ModalHeader>

  {#if editorError}
    <p class="announcements__error" role="alert">{editorError}</p>
  {/if}

  {#if draft}
    <form
      class="announcements__form"
      onsubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <label class="announcements__field">
        <span>Title</span>
        <input bind:value={draft.title} maxlength="120" required />
      </label>
      <label class="announcements__field">
        <span>Body</span>
        <textarea bind:value={draft.body} rows="4" required></textarea>
      </label>
      <div class="announcements__row">
        <label class="announcements__field">
          <span>Severity</span>
          <select bind:value={draft.severity}>
            {#each ANNOUNCEMENT_SEVERITIES as severity (severity)}
              <option value={severity}
                >{ANNOUNCEMENT_SEVERITY_LABELS[severity]}</option
              >
            {/each}
          </select>
        </label>
        <label class="announcements__field">
          <span>Starts</span>
          <input type="datetime-local" bind:value={draft.startsOn} required />
        </label>
        <label class="announcements__field">
          <span>Ends (optional)</span>
          <input type="datetime-local" bind:value={draft.endsOn} />
        </label>
      </div>
      <label class="announcements__field">
        <span>Link (optional)</span>
        <input type="url" bind:value={draft.linkUrl} placeholder="https://…" />
      </label>
      <div class="announcements__actions">
        <button
          type="button"
          class="announcements__btn"
          onclick={() => (draft = null)}>Cancel</button
        >
        <button
          type="submit"
          class="announcements__btn announcements__btn--primary"
          disabled={saving}>{saving ? "Saving…" : "Save"}</button
        >
      </div>
    </form>
  {/if}

  <div class="announcements__list">
    {#if rows.length === 0}
      <div class="announcements__empty">
        <MegaphoneOff size={28} aria-hidden="true" />
        <p>No announcements right now.</p>
        <p>Campus updates also go out on Facebook.</p>
        <CommunityPlatformLink
          brand="facebook"
          href={FACEBOOK_URL}
          label="Follow on Facebook"
        />
      </div>
    {/if}
    {#each rows as row (row.id)}
      <article class="announcements__item" data-severity={row.severity}>
        <div class="announcements__item-head">
          <span class="announcements__chip" data-severity={row.severity}>
            {ANNOUNCEMENT_SEVERITY_LABELS[
              row.severity as AnnouncementSeverity
            ] ?? row.severity}
          </span>
          <h3 class="announcements__item-title">{row.title}</h3>
        </div>
        <p class="announcements__body">{row.body}</p>
        {#if row.linkUrl}
          <a
            class="announcements__link"
            href={row.linkUrl}
            target="_blank"
            rel="noopener noreferrer">More details</a
          >
        {/if}
        <p class="announcements__meta">
          <time datetime={row.startsOn} title={formatCampusDateTime(row.startsOn)}>
            {relativeDateLabel(row.startsOn)}
          </time>
          {#if row.author}<span>by {row.author}</span>{/if}
          {#if canPublish && statusLabel(row)}
            <span class="announcements__status">({statusLabel(row)})</span>
          {/if}
        </p>
        {#if canPublish}
          <div class="announcements__actions">
            <button
              type="button"
              class="announcements__btn"
              onclick={() => editDraft(row)}>Edit</button
            >
            <button
              type="button"
              class="announcements__btn announcements__btn--danger"
              onclick={() => void remove(row)}
              disabled={saving}>Delete</button
            >
          </div>
        {/if}
      </article>
    {/each}
  </div>
</div>

<style>
  .announcements {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    flex: 1 1 auto;
    min-height: 0;
  }

  .announcements__empty,
  .announcements__meta {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--theme-text-2, hsl(0, 0%, 40%));
  }

  .announcements__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 1.5rem 1rem 0.75rem;
    text-align: center;
  }

  .announcements__empty p {
    margin: 0;
  }

  .announcements__empty p:first-of-type {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--theme-text, hsl(0, 0%, 20%));
  }

  .announcements__empty :global(.community-platform-link) {
    min-height: 2.75rem;
  }

  /* Phones: stay clear of the bottom nav instead of covering its labels. The
     dialog is centred, so reserve the nav's height at both ends. */
  @media (max-width: 48rem) {
    .announcements {
      max-height: calc(
        100dvh - 2 * (var(--mobile-bottom-nav-height, 4.5rem) + 1.5rem)
      );
    }
  }

  .announcements__error {
    margin: 0 1rem;
    font-size: 0.8125rem;
    color: var(--theme-accent-text, hsl(0, 65%, 38%));
  }

  .announcements__list {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    overflow-y: auto;
    overscroll-behavior: contain;
    min-height: 0;
    padding: 0 1rem 0.5rem;
  }

  .announcements__item {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    padding: 0.625rem;
    border: 1px solid var(--theme-border, hsl(0, 0%, 90%));
    border-left: 4px solid var(--theme-border-strong, hsl(210, 8%, 70%));
    border-radius: 0.5rem;
  }
  .announcements__item[data-severity="warning"] {
    border-left-color: var(--theme-amber-text, hsl(32, 78%, 48%));
  }
  .announcements__item[data-severity="critical"] {
    border-left-color: var(--theme-accent-text, hsl(0, 65%, 45%));
  }

  .announcements__item-head {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .announcements__item-title {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 700;
    color: var(--theme-text, hsl(0, 0%, 15%));
  }

  .announcements__chip {
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    padding: 0.125rem 0.375rem;
    border-radius: 0.75rem;
    background: var(--theme-blue-soft, hsl(210, 20%, 94%));
    color: var(--theme-text, hsl(210, 20%, 30%));
  }
  .announcements__chip[data-severity="warning"] {
    background: var(--theme-amber-soft, hsl(38, 92%, 90%));
    color: var(--theme-amber-text, hsl(24, 62%, 26%));
  }
  .announcements__chip[data-severity="critical"] {
    background: var(--theme-accent-soft, hsl(0, 70%, 94%));
    color: var(--theme-accent-text, hsl(0, 60%, 32%));
  }

  .announcements__body {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.45;
    color: var(--theme-text, hsl(0, 0%, 25%));
    /* Plain text with author line breaks preserved (no markdown renderer). */
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .announcements__link {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
  }

  .announcements__form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 0 1rem;
    padding: 0.625rem;
    border: 1px solid var(--theme-border, hsl(0, 0%, 88%));
    border-radius: 0.5rem;
    background: var(--theme-surface, hsl(0, 0%, 98%));
  }

  .announcements__row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .announcements__row .announcements__field {
    flex: 1 1 8rem;
    min-width: 0;
  }

  .announcements__field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--theme-text-2, hsl(0, 0%, 35%));
  }
  .announcements__field :is(input, textarea, select) {
    font: inherit;
    font-weight: 400;
    padding: 0.375rem 0.5rem;
    border: 1px solid var(--theme-border, hsl(0, 0%, 80%));
    border-radius: 0.375rem;
    background: var(--theme-surface, white);
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
  }

  .announcements__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .announcements__btn {
    font-size: 0.8125rem;
    font-weight: 600;
    padding: 0.375rem 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid var(--theme-border, hsl(0, 0%, 80%));
    background: var(--theme-surface, white);
    color: var(--theme-text, hsl(0, 0%, 25%));
    cursor: pointer;
  }
  .announcements__btn--primary {
    background: var(--theme-accent-fill, hsl(5, 53%, 32%));
    border-color: var(--theme-accent-text, hsl(5, 53%, 32%));
    color: white;
    align-self: flex-start;
  }
  .announcements__btn--danger {
    color: var(--theme-accent-text, hsl(0, 60%, 38%));
  }
  .announcements__btn[disabled] {
    opacity: 0.6;
    cursor: progress;
  }
</style>
