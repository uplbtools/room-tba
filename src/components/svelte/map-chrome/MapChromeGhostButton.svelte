<script lang="ts">
  import type { Snippet } from "svelte";
  import "./map-chrome.css";

  type Props = {
    type?: "button" | "submit";
    variant?: "accent" | "muted";
    disabled?: boolean;
    onclick?: () => void;
    children?: Snippet;
  };

  let {
    type = "button",
    variant = "accent",
    disabled = false,
    onclick,
    children,
  }: Props = $props();
</script>

<button
  {type}
  class="map-chrome-ghost-btn"
  class:map-chrome-ghost-btn--muted={variant === "muted"}
  {disabled}
  {onclick}
>
  {@render children?.()}
</button>
