<script lang="ts">
  import type { Snippet } from "svelte";
  import EntityPanelClose from "./EntityPanelClose.svelte";

  type Props = {
    closeAriaLabel: string;
    closeTitle?: string;
    onclose: () => void;
    kickerClass?: string;
    kicker?: Snippet;
    trailing?: Snippet;
  };

  let {
    closeAriaLabel,
    closeTitle,
    onclose,
    kickerClass = "",
    kicker,
    trailing,
  }: Props = $props();
</script>

<header class="entity-panel-header">
  <div class="entity-panel-header-top">
    <div class="entity-panel-kicker {kickerClass}">
      {@render kicker?.()}
    </div>
    <EntityPanelClose
      ariaLabel={closeAriaLabel}
      title={closeTitle}
      onclick={onclose}
    />
  </div>
  {@render trailing?.()}
</header>

<style>
  @import "./entity-detail.css";
</style>
