<script lang="ts">
  let {
    updatedAt,
    label = "Last updated",
  }: {
    updatedAt: string | null | undefined;
    label?: string;
  } = $props();

  const formatted = $derived.by(() => {
    if (!updatedAt) return null;
    const date = new Date(updatedAt);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  });
</script>

{#if formatted}
  <p class="entity-last-updated">
    {label}: {formatted}
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
