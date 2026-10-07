<script lang="ts">
  import type { EntityAttribution } from "@lib/editor/entity-attribution";
  import { formatHistoryTime } from "@lib/editor/history-presentation";
  import { modalStore } from "@lib/store.svelte";

  let {
    updatedAt,
    entityType,
    entityId,
    entityName,
    label = "Last updated",
  }: {
    updatedAt: string | null | undefined;
    entityType?: string;
    entityId?: number | null;
    /** Named in the history dialog's header. */
    entityName?: string | null;
    label?: string;
  } = $props();

  let attribution = $state<EntityAttribution | null>(null);

  // Campus time, so the same edit reads the same date on every device and
  // matches the edit history dialog.
  function formatDate(value: string | null | undefined, withTime = false) {
    return value ? formatHistoryTime(value, withTime) : null;
  }

  const formatted = $derived(formatDate(updatedAt, true));

  // "Added by X, last edited by Y on <date>". Falls back to the plain
  // timestamp when no history row exists or the lookup failed.
  const credit = $derived.by(() => {
    const a = attribution;
    if (!a) return null;
    const by = (name: string | null) => (name ? ` by ${name}` : "");
    const edited = formatDate(a.lastEditedAt);
    const added = formatDate(a.addedAt);
    if (a.addedAt && edited) {
      return `Added${by(a.addedBy)}, last edited${by(a.lastEditedBy)} on ${edited}`;
    }
    if (added) return `Added${by(a.addedBy)} on ${added}`;
    if (edited) return `Last edited${by(a.lastEditedBy)} on ${edited}`;
    return null;
  });

  $effect(() => {
    attribution = null;
    if (!entityType || !entityId) return;

    let cancelled = false;
    const params = new URLSearchParams({
      entityType,
      entityId: String(entityId),
    });

    void fetch(`/api/editor-attribution?${params.toString()}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { attribution?: EntityAttribution | null } | null) => {
        if (!cancelled) attribution = payload?.attribution ?? null;
      })
      .catch(() => {
        if (!cancelled) attribution = null;
      });

    return () => {
      cancelled = true;
    };
  });

  function openHistory() {
    if (!entityType || !entityId) return;
    modalStore.openModal("entity-history", {
      historyEntity: {
        entityType,
        entityId,
        ...(entityName ? { name: entityName } : {}),
      },
    });
  }
</script>

{#if credit || formatted || (entityType && entityId)}
  <p class="entity-last-updated">
    {#if credit}
      {credit}.
    {:else if formatted}
      {label}: {formatted}.
    {/if}
    {#if entityType && entityId}
      <button
        type="button"
        class="entity-last-updated__history"
        onclick={openHistory}>Edit history</button
      >
    {/if}
  </p>
{/if}

<style>
  .entity-last-updated {
    margin: 0.35rem 0 0;
    font-size: 0.8rem;
    color: var(--text-muted, var(--theme-text-muted, #64748b));
    line-height: 1.3;
  }

  /* Inline text link, but with a finger-sized hit area: the padding grows
     the target and the matching negative margin keeps the text in place. */
  .entity-last-updated__history {
    display: inline-block;
    background: none;
    border: none;
    padding: 0.875rem 0.375rem;
    margin: -0.875rem -0.375rem;
    font: inherit;
    color: inherit;
    text-decoration: underline;
    cursor: pointer;
  }

  .entity-last-updated__history:hover,
  .entity-last-updated__history:focus-visible {
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
  }
</style>
