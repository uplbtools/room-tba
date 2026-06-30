<script lang="ts">
  import type { Snippet } from "svelte";
  import "./map-chrome.css";

  type Props = {
    href: string;
    target?: string;
    rel?: string;
    ariaLabel?: string;
    toolbar?: boolean;
    children?: Snippet;
  };

  let {
    href,
    target = "_blank",
    rel = "noreferrer",
    ariaLabel,
    toolbar = false,
    children,
  }: Props = $props();
</script>

<a
  class="map-chrome-action-chip"
  class:map-chrome-action-chip--toolbar={toolbar}
  {href}
  {target}
  {rel}
  aria-label={ariaLabel}
>
  <span class="map-chrome-action-chip__inner">
    {@render children?.()}
  </span>
</a>

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
