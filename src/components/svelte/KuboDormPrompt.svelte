<script lang="ts">
  import { onMount } from "svelte";
  import X from "@lucide/svelte/icons/x";
  import { queryStore } from "@lib/store.svelte";

  const DISMISS_KEY = "room-tba:kubo-dorm-prompt-dismissed";
  let dismissed = $state(false);

  onMount(() => {
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      // Private browsing can deny storage; dismissal then lasts for this view.
    }
  });

  function dismiss() {
    dismissed = true;
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // The prompt still closes when storage is unavailable.
    }
  }
</script>

{#if !dismissed && queryStore.category === null}
  <aside class="kubo-dorm-prompt" role="status">
    <div>
      <strong>Find a dorm through Kubo</strong>
      <p>Room TBA now links Kubo listings with photos, prices, and contact details.</p>
    </div>
    <a
      href="https://kubo.community"
      target="_blank"
      rel="noopener noreferrer"
    >
      Browse Kubo
    </a>
    <button type="button" aria-label="Dismiss Kubo dorm prompt" onclick={dismiss}>
      <X size={16} aria-hidden="true" />
    </button>
  </aside>
{/if}

<style>
  .kubo-dorm-prompt {
    position: fixed;
    left: var(--map-ui-padding, 0.5rem);
    bottom: calc(
      var(--status-bar-block-height, 2rem) + var(--map-ui-padding, 0.5rem) +
        env(safe-area-inset-bottom, 0px)
    );
    z-index: var(--z-status-bar, 5);
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: 0.625rem;
    width: min(23rem, calc(100vw - 2 * var(--map-ui-padding, 0.5rem)));
    box-sizing: border-box;
    padding: 0.75rem;
    border: 1px solid hsl(38 40% 62%);
    border-radius: var(--map-chrome-radius, 1rem);
    background: hsl(42 65% 96% / 0.97);
    box-shadow: var(--map-chrome-shadow);
    color: hsl(35 48% 17%);
    pointer-events: auto;
  }

  strong {
    display: block;
    font-size: 0.8125rem;
  }

  p {
    margin: 0.2rem 0 0;
    color: hsl(35 30% 28%);
    font-size: 0.75rem;
    line-height: 1.35;
  }

  a {
    color: inherit;
    font-size: 0.75rem;
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 2px;
    white-space: nowrap;
  }

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    padding: 0;
    border: 0;
    border-radius: 0.5rem;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }

  button:hover,
  button:focus-visible {
    background: hsl(38 40% 86%);
  }

  a:focus-visible,
  button:focus-visible {
    outline: 2px solid hsl(35 55% 30%);
    outline-offset: 2px;
  }

  @media (max-width: 30rem) {
    .kubo-dorm-prompt {
      grid-template-columns: 1fr auto;
    }

    a {
      grid-column: 1;
    }

    button {
      grid-column: 2;
      grid-row: 1;
    }
  }
</style>
