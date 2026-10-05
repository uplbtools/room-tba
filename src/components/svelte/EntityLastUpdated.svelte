<script lang="ts">
  import type { EntityAttribution } from "@lib/editor/entity-attribution";
  import { modalStore } from "@lib/store.svelte";

  let {
    updatedAt,
    entityType,
    entityId,
    label = "Last updated",
  }: {
    updatedAt: string | null | undefined;
    entityType?: string;
    entityId?: number | null;
    label?: string;
  } = $props();

  let attribution = $state<EntityAttribution | null>(null);

  function formatDate(value: string | null | undefined, withTime = false) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString(
      undefined,
      withTime
        ? { dateStyle: "medium", timeStyle: "short" }
        : { dateStyle: "medium" },
    );
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
      historyEntity: { entityType, entityId },
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
    color: var(--text-muted, #64748b);
    line-height: 1.3;
  }

  .entity-last-updated__history {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    color: inherit;
    text-decoration: underline;
    cursor: pointer;
  }

  .entity-last-updated__history:hover,
  .entity-last-updated__history:focus-visible {
    color: hsl(5, 53%, 32%);
  }
</style>
