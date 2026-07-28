<script lang="ts">
  import Users from "@lucide/svelte/icons/users";
  import { fetchVisitorCount } from "@lib/visitor-count";

  let { digits = 6, label = "Visitor #" }: {
    digits?: number;
    label?: string;
  } = $props();

  let count = $state<number | null>(null);
  let failed = $state(false);

  $effect(() => {
    let active = true;
    fetchVisitorCount()
      .then((value) => {
        if (active) count = value;
      })
      .catch(() => {
        if (active) failed = true;
      });
    return () => {
      active = false;
    };
  });

  const display = $derived(
    count !== null
      ? count.toLocaleString()
      : failed
        ? "?"
        : "...",
  );
  const announce = $derived(
    count !== null
      ? `You are visitor number ${count.toLocaleString()}.`
      : failed
        ? "Visitor count unavailable."
        : "Loading visitor count.",
  );
</script>

<p class="visitor-counter" role="status" aria-live="polite" aria-label={announce}>
  <Users size={16} aria-hidden="true" class="visitor-counter__icon" />
  <span class="visitor-counter__copy">
    <span class="visitor-counter__label">{label}</span>
    <span class="visitor-counter__digits" aria-hidden="true">
      <span class="visitor-counter__plain">{display}</span>
    </span>
  </span>
</p>

<style>
  .visitor-counter {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    padding: 0.5rem 0.875rem;
    border-radius: 999px;
    background: hsl(5, 32%, 95%);
    border: 1px solid hsl(5, 28%, 78%);
    color: hsl(5, 58%, 22%);
    box-shadow: 0 1px 2px hsla(5, 40%, 20%, 0.06);
  }

  .visitor-counter :global(.visitor-counter__icon) {
    flex-shrink: 0;
    color: hsl(5, 65%, 32%);
  }

  .visitor-counter__copy {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.375rem;
    min-width: 0;
  }

  .visitor-counter__label {
    font-size: 0.8125rem;
    font-weight: 700;
    line-height: 1.2;
    white-space: nowrap;
  }

  .visitor-counter__digits {
    display: inline-flex;
    align-items: center;
    gap: 0.125rem;
  }

  .visitor-counter__plain {
    font-size: 0.875rem;
    font-weight: 800;
    color: hsl(5, 70%, 22%);
  }
</style>
