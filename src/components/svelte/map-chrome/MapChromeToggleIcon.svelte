<script lang="ts">
  import type { Snippet } from "svelte";
  import "./map-chrome.css";

  type Props = {
    class?: string;
    children?: Snippet;
  };

  let { class: extraClass = "", children }: Props = $props();
</script>

<span class="map-chrome-toggle-btn {extraClass}" aria-hidden="true">
  {@render children?.()}
</span>
