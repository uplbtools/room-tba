<script lang="ts">
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

  let editedBy = $state<string | null>(null);

  const formatted = $derived.by(() => {
    if (!updatedAt) return null;
    const date = new Date(updatedAt);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  });

  const attribution = $derived.by(() => {
    const name = editedBy?.trim();
    return name ? ` by ${name}` : "";
  });

  $effect(() => {
    editedBy = null;
    if (!entityType || !entityId) return;

    let cancelled = false;
    const params = new URLSearchParams({
      entityType,
      entityId: String(entityId),
    });

    void fetch(`/api/editor-attribution?${params.toString()}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { attribution?: { editedBy?: string | null } } | null) => {
        if (!cancelled) editedBy = payload?.attribution?.editedBy ?? null;
      })
      .catch(() => {
        if (!cancelled) editedBy = null;
      });

    return () => {
      cancelled = true;
    };
  });
</script>

{#if formatted}
  <p class="entity-last-updated">
    {label}: {formatted}{attribution}
  </p>
{/if}

<style>
  .entity-last-updated {
    margin: 0.35rem 0 0;
    font-size: 0.8rem;
    color: var(--text-muted, #64748b);
    line-height: 1.3;
  }
</style>
