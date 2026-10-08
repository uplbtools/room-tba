<script lang="ts">
  import { onMount } from "svelte";
  import LoadingIndicator from "@ui/LoadingIndicator.svelte";
  import SettingsSection from "@ui/modal/SettingsSection.svelte";
  import EntityEditorMessage from "@ui/editor/EntityEditorMessage.svelte";
  import { auditActionLabel } from "@lib/admin/audit-labels";

  type Entry = {
    id: number;
    actorLabel: string | null;
    action: string;
    targetLabel: string | null;
    detail: Record<string, unknown> | null;
    ip: string | null;
    createdAt: string;
  };

  let entries = $state<Entry[]>([]);
  let nextBefore = $state<number | null>(null);
  let loading = $state(false);
  let loaded = $state(false);
  let error = $state<string | null>(null);

  async function load(before: number | null) {
    loading = true;
    error = null;
    try {
      const res = await fetch(
        `/api/admin/audit-log${before ? `?before=${before}` : ""}`,
        { credentials: "same-origin" },
      );
      if (!res.ok) {
        error = "Could not load the audit log.";
        return;
      }
      const data = (await res.json()) as {
        entries: Entry[];
        nextBefore: number | null;
      };
      entries = before ? [...entries, ...data.entries] : data.entries;
      nextBefore = data.nextBefore;
    } catch {
      error = "Network error loading the audit log.";
    } finally {
      loading = false;
      loaded = true;
    }
  }

  function when(value: string): string {
    const date = new Date(`${value.replace(" ", "T")}Z`);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
  }

  function detailText(detail: Record<string, unknown> | null): string {
    if (!detail) return "";
    if (typeof detail.from === "string" && typeof detail.to === "string") {
      return `${detail.from} to ${detail.to}`;
    }
    if (typeof detail.entityLabel === "string") return detail.entityLabel;
    if (typeof detail.role === "string") return `as ${detail.role}`;
    if (detail.emailFailed) return "email failed to send";
    return "";
  }

  onMount(() => void load(null));
</script>

<SettingsSection
  title="Audit log"
  description="Sign-ins, account changes, and review decisions. Admins only."
>
  {#if error}
    <EntityEditorMessage variant="error" message={error} />
  {/if}
  {#if !loaded}
    <p><LoadingIndicator /></p>
  {:else if entries.length === 0}
    <p class="audit-empty">No entries yet.</p>
  {:else}
    <ol class="audit-list" aria-label="Audit log entries">
      {#each entries as entry (entry.id)}
        <li class="audit-row">
          <span class="audit-what">
            <strong>{auditActionLabel(entry.action)}</strong>
            {#if entry.targetLabel}
              <span>{entry.targetLabel}</span>
            {/if}
            {#if detailText(entry.detail)}
              <span class="audit-detail">{detailText(entry.detail)}</span>
            {/if}
          </span>
          <small class="audit-meta">
            {when(entry.createdAt)}{entry.actorLabel
              ? `, by ${entry.actorLabel}`
              : ""}{entry.ip ? `, ${entry.ip}` : ""}
          </small>
        </li>
      {/each}
    </ol>
  {/if}
  {#snippet footer()}
    {#if nextBefore}
      <button
        type="button"
        class="audit-more"
        disabled={loading}
        onclick={() => load(nextBefore)}
      >
        {loading ? "Loading…" : "Load older entries"}
      </button>
    {/if}
  {/snippet}
</SettingsSection>

<style>
  .audit-empty {
    margin: 0;
    font-size: 0.875rem;
  }
  .audit-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }
  .audit-row {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--theme-border, hsl(0, 0%, 92%));
    font-size: 0.875rem;
    overflow-wrap: anywhere;
  }
  .audit-row:last-child {
    border-bottom: none;
  }
  .audit-what {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }
  .audit-detail,
  .audit-meta {
    color: var(--theme-text-2, hsl(0, 0%, 42%));
  }
  .audit-more {
    min-height: 2.5rem;
    padding: 0 1rem;
    border: 1px solid var(--theme-border-strong, hsl(0, 0%, 75%));
    border-radius: 999px;
    background: none;
    color: var(--theme-text, hsl(0, 0%, 15%));
    font-weight: 600;
    cursor: pointer;
  }
</style>
