<script lang="ts">
  import Lightbulb from "@lucide/svelte/icons/lightbulb";

  type Props = {
    ondismiss: () => void;
    /** Opens the full "How Room TBA works" tour. */
    onguide: () => void;
  };

  const { ondismiss, onguide }: Props = $props();

  const TIPS = [
    "Search a room, building, or course code like CMSC\u00a012.",
    "Tap a pin for details and walking directions.",
    "Add classes in the Planner and their buildings show on the map.",
  ];
</script>

<!-- Non-modal on purpose: the map behind it stays fully usable. -->
<section class="first-run-tips" aria-labelledby="first-run-tips-title">
  <h2 class="first-run-tips__title" id="first-run-tips-title">
    <Lightbulb size={16} aria-hidden="true" />
    Welcome to Room TBA
  </h2>
  <ul class="first-run-tips__list">
    {#each TIPS as tip (tip)}
      <li>{tip}</li>
    {/each}
  </ul>
  <div class="first-run-tips__actions">
    <button type="button" class="first-run-tips__link" onclick={onguide}>
      How it works
    </button>
    <button type="button" class="first-run-tips__primary" onclick={ondismiss}>
      Got it
    </button>
  </div>
</section>

<style>
  .first-run-tips {
    position: fixed;
    left: 50%;
    bottom: calc(var(--mobile-bottom-nav-height, 0px) + 0.75rem);
    z-index: 19;
    box-sizing: border-box;
    width: min(24rem, calc(100vw - 1.5rem));
    padding: 0.875rem 1rem 0.75rem;
    transform: translateX(-50%);
    border: 1px solid var(--map-chrome-border, hsl(5, 25%, 85%));
    border-radius: 1rem;
    background: var(--map-chrome-surface, #fff);
    color: hsl(0, 0%, 15%);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
  }

  @media (min-width: 48rem) {
    .first-run-tips {
      left: 1.5rem;
      bottom: 1.5rem;
      transform: none;
    }
  }

  .first-run-tips__title {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    margin: 0 0 0.375rem;
    font-size: 0.9375rem;
    font-weight: 700;
    color: hsl(5, 53%, 32%);
  }

  .first-run-tips__list {
    display: grid;
    gap: 0.25rem;
    margin: 0;
    padding-left: 1.125rem;
    font-size: 0.8125rem;
    line-height: 1.4;
  }

  .first-run-tips__actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.625rem;
  }

  .first-run-tips__link,
  .first-run-tips__primary {
    min-height: 2.25rem;
    padding: 0 0.875rem;
    border-radius: 999px;
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
  }

  .first-run-tips__link {
    border: none;
    background: transparent;
    color: hsl(5, 53%, 32%);
  }

  .first-run-tips__primary {
    border: none;
    background: hsl(5, 53%, 32%);
    color: white;
  }

  .first-run-tips__link:focus-visible,
  .first-run-tips__primary:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
    outline-offset: 2px;
  }
</style>
