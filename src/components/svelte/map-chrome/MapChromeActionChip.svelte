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
    onclick,
    children,
  }: Props = $props();
</script>

<button
  {type}
  class="map-chrome-action-chip"
  class:map-chrome-action-chip--toolbar={toolbar}
  {disabled}
  {onclick}
  aria-label={ariaLabel}
  aria-busy={ariaBusy}
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
