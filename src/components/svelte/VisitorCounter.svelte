<script lang="ts">
  import { fetchVisitorCount } from "@lib/visitor-count";

  let { digits = 6, label = "You are visitor #" }: {
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
      ? String(count).padStart(digits, "0")
      : (failed ? "?" : "0").repeat(digits),
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
  <span class="visitor-counter__label">{label}</span>
  {#each display.split("") as char, i (i)}
    <span class="visitor-counter__digit" aria-hidden="true">{char}</span>
  {/each}
</p>

<style>
  .visitor-counter {
    display: inline-flex;
    align-items: center;
    gap: 0.125rem;
    margin: 0;
    font-size: 0.75rem;
    color: hsl(0, 0%, 45%);
  }

  .visitor-counter__label {
    margin-right: 0.25rem;
  }

  .visitor-counter__digit {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1rem;
    padding: 0.125rem 0;
    border-radius: 0.25rem;
    background: hsl(5, 25%, 18%);
    color: hsl(45, 90%, 70%);
    font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
    font-size: 0.75rem;
    font-weight: 700;
    line-height: 1;
  }
</style>
