<script lang="ts">
  import type { Snippet } from "svelte";
  import "./map-chrome.css";

  type Props = {
    ariaExpanded: boolean;
    ariaControls?: string;
    ariaLabel: string;
    onclick: () => void;
    children?: Snippet;
  };

  let { ariaExpanded, ariaControls, ariaLabel, onclick, children }: Props =
    $props();
</script>

<button
  type="button"
  class="map-chrome-fab-trigger"
  aria-label={ariaLabel}
  aria-expanded={ariaExpanded}
  aria-controls={ariaControls}
  {onclick}
>
  {@render children?.()}
</button>
