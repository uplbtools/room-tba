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
  {@render children?.()}
</button>
