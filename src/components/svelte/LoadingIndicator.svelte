<script lang="ts">
  // Shared loading state: a small spinner + label, sized by the parent's font.
  // `block` renders the splash-style badge + progress track centered in the
  // parent instead of the inline spinner (side-panel room loading).
  let { label = "Loading…", block = false }: { label?: string; block?: boolean } =
    $props();
</script>

{#if block}
  <span class="loading-block" role="status">
    <span class="loading-block__badge" aria-hidden="true">
      <img src="/logo.png" alt="" width="28" height="28" decoding="async" />
    </span>
    <span class="loading-block__track" aria-hidden="true">
      <span class="loading-block__fill"></span>
    </span>
    <span class="loading-block__label">{label}</span>
  </span>
{:else}
  <span class="loading-indicator" role="status">
    <span class="loading-indicator__spinner" aria-hidden="true"></span>
    <span class="loading-indicator__label">{label}</span>
  </span>
{/if}

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

  .loading-block {
    display: flex;
    /* Fill leftover panel height so the graphic sits mid-panel. */
    flex: 1 1 auto;
    min-height: 12rem;
    width: 100%;
    box-sizing: border-box;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    margin: auto 0;
    padding: 2rem 1rem;
    text-align: center;
  }

  .loading-block__badge {
    display: grid;
    place-items: center;
    width: 3rem;
    height: 3rem;
    border-radius: 0.875rem;
    background: linear-gradient(160deg, hsl(5, 58%, 40%), hsl(5, 55%, 27%));
    box-shadow:
      0 1px 0 hsla(0, 0%, 100%, 0.25) inset,
      0 6px 16px hsla(5, 60%, 25%, 0.3);
  }

  .loading-block__badge img {
    display: block;
    width: 1.75rem;
    height: 1.75rem;
    object-fit: contain;
  }

  .loading-block__track {
    position: relative;
    width: 7rem;
    height: 0.1875rem;
    border-radius: 999px;
    background: hsla(5, 40%, 40%, 0.18);
    overflow: hidden;
  }

  .loading-block__fill {
    position: absolute;
    top: 0;
    left: -40%;
    width: 40%;
    height: 100%;
    border-radius: 999px;
    background: hsl(5, 53%, 32%);
    animation: loading-indicator-slide 1.1s ease-in-out infinite;
  }

  .loading-block__label {
    font-size: 0.8125rem;
    font-weight: 600;
    color: hsl(5, 12%, 42%);
  }

  @keyframes loading-indicator-spin {
    to {
      rotate: 360deg;
    }
  }

  @keyframes loading-indicator-slide {
    0% {
      left: -40%;
    }
    100% {
      left: 100%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .loading-indicator__spinner,
    .loading-block__fill {
      animation: none;
    }
  }
</style>
