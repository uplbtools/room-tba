<script lang="ts">
  import type { Snippet } from "svelte";
  import "./map-chrome.css";

  type Props = {
    type?: "button" | "submit";
    disabled?: boolean;
    onclick?: () => void;
    children?: Snippet;
  };

  let {
    type = "button",
    disabled = false,
    onclick,
    children,
  }: Props = $props();
</script>

<button {type} class="map-chrome-action-chip" {disabled} {onclick}>
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
