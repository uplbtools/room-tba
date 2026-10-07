<script lang="ts">
  import X from "@lucide/svelte/icons/x";
  import { queryStore, sidePanelStore } from "@lib/store.svelte";

  type Props = {
    ariaLabel: string;
    title?: string;
    /** Defaults to closing the open entity sheet (same as the search X). */
    onclick?: () => void;
    /** Keep the button on mobile sheets too (browse lists). */
    showOnMobile?: boolean;
  };

  let {
    ariaLabel,
    title = ariaLabel,
    onclick = closeEntitySheet,
    showOnMobile = false,
  }: Props = $props();

  function closeEntitySheet() {
    queryStore.clearQuery();
    queryStore.inputValue = "";
    // openPanel() metadata outranks the query in resolvePanelContent.
    sidePanelStore.closePanel();
  }
</script>

<button
  type="button"
  class="entity-panel-close"
  class:entity-panel-close--mobile={showOnMobile}
  aria-label={ariaLabel}
  {title}
  {onclick}
>
  <X size={16} aria-hidden="true" />
  <span>Close</span>
</button>

<style>
  @import "./entity-detail.css";

  /* Mobile sheets already close via the drawer handle, swipe, and scrim taps;
     a second Close button reads as a duplicate affordance. Desktop keeps it —
     the pinned drawer has no swipe gesture. */
  :global(.app-layout:not(.redesign-desktop)) .entity-panel-close {
    display: none;
  }

  /* Browse lists opened from the App menu are the exception: nothing on the
     sheet says it can be swiped away, so they keep an icon-only X. */
  :global(.app-layout:not(.redesign-desktop))
    .entity-panel-close.entity-panel-close--mobile {
    display: inline-flex;
    padding: 0;
    border-color: transparent;
    background: transparent;
    color: hsl(0, 0%, 30%);
  }

  :global(.app-layout:not(.redesign-desktop))
    .entity-panel-close--mobile
    span {
    display: none;
  }
</style>
