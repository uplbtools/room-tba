<script lang="ts">
  import type { Snippet } from "svelte";
  import EntityPanelClose from "./EntityPanelClose.svelte";

  type Props = {
    closeAriaLabel?: string;
    closeTitle?: string;
    /** Omit for lists the search bar's X already closes. */
    onclose?: () => void;
    /** Show the close button on mobile sheets too (browse lists). */
    closeOnMobile?: boolean;
    trailing?: Snippet;
  };

  let {
    closeAriaLabel,
    closeTitle,
    onclose,
    closeOnMobile = false,
    trailing,
  }: Props = $props();
</script>

<header class="entity-panel-header">
  <div class="entity-panel-header-top">
    {#if onclose}
      <EntityPanelClose
        ariaLabel={closeAriaLabel ?? "Close"}
        title={closeTitle}
        onclick={onclose}
        showOnMobile={closeOnMobile}
      />
    {/if}
    <div class="entity-panel-header-content">
      {@render trailing?.()}
    </div>
  </div>
</header>

<style>
  @import "./entity-detail.css";
</style>
