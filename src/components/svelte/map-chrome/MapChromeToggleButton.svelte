<script lang="ts">
  import type { Snippet } from "svelte";
  import "./map-chrome.css";

  type Props = {
    type?: "button" | "submit";
    disabled?: boolean;
    ariaLabel?: string;
    ariaExpanded?: boolean;
    ariaControls?: string;
    title?: string;
    class?: string;
    onclick?: () => void;
    children?: Snippet;
  };

  let {
    type = "button",
    disabled = false,
    ariaLabel,
    ariaExpanded,
    ariaControls,
    title,
    class: extraClass = "",
    onclick,
    children,
  }: Props = $props();
</script>

<button
  {type}
  class="map-chrome-toggle-btn {extraClass}"
  {disabled}
  aria-label={ariaLabel}
  aria-expanded={ariaExpanded}
  aria-controls={ariaControls}
  {title}
  {onclick}
>
  {@render children?.()}
</button>
