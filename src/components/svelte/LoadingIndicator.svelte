<script lang="ts">
  // Shared loading state: a small spinner + label, sized by the parent's font.
  let { label = "Loading…" }: { label?: string } = $props();
</script>

<span class="loading-indicator" role="status">
  <span class="loading-indicator__spinner" aria-hidden="true"></span>
  <span class="loading-indicator__label">{label}</span>
</span>

<style>
  .loading-indicator {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }

  .loading-indicator__spinner {
    width: 0.875em;
    height: 0.875em;
    flex: 0 0 auto;
    border-radius: 50%;
    border: 2px solid hsl(5, 30%, 85%);
    border-top-color: hsl(5, 53%, 32%);
    animation: loading-indicator-spin 0.8s linear infinite;
  }

  .loading-indicator__label {
    min-width: 0;
  }

  @keyframes loading-indicator-spin {
    to {
      rotate: 360deg;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .loading-indicator__spinner {
      animation: none;
    }
  }
</style>
