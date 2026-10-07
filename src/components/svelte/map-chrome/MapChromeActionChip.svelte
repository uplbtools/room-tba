<script lang="ts">
  import type { Snippet } from "svelte";
  import "./map-chrome.css";

  type Props = {
    type?: "button" | "submit";
    disabled?: boolean;
    ariaLabel?: string;
    ariaBusy?: boolean;
    title?: string;
    toolbar?: boolean;
    /** Filled brand button: the one main action of a place sheet. */
    primary?: boolean;
    /** Toggle buttons (Save / Saved) expose their state. */
    pressed?: boolean;
    onclick?: () => void;
    children?: Snippet;
  };

  let {
    type = "button",
    disabled = false,
    ariaLabel,
    ariaBusy = false,
    title,
    toolbar = false,
    primary = false,
    pressed,
    onclick,
    children,
  }: Props = $props();
</script>

<button
  {type}
  class="map-chrome-action-chip"
  class:map-chrome-action-chip--toolbar={toolbar}
  class:map-chrome-action-chip--primary={primary}
  {disabled}
  {onclick}
  aria-label={ariaLabel}
  aria-busy={ariaBusy}
  aria-pressed={pressed}
  title={title ?? ariaLabel}
>
  <span class="map-chrome-action-chip__inner">
    {@render children?.()}
  </span>
</button>

<style>
  .map-chrome-action-chip__inner {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    min-width: 0;
    line-height: 1.2;
  }

  .map-chrome-action-chip__inner :global(svg) {
    display: block;
    flex-shrink: 0;
    width: 14px;
    height: 14px;
  }
</style>
