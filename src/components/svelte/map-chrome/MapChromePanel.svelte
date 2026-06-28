<script lang="ts">
  import type { Snippet } from "svelte";
  import X from "@lucide/svelte/icons/x";
  import "./map-chrome.css";

  type Props = {
    id?: string;
    title: string;
    ariaLabel?: string;
    style?: string;
    panelClass?: string;
    element?: HTMLDivElement | null;
    onclose: () => void;
    children?: Snippet;
  };

  let {
    id,
    title,
    ariaLabel,
    style,
    panelClass = "map-chrome-panel",
    element = $bindable(null),
    onclose,
    children,
  }: Props = $props();
</script>

<div
  bind:this={element}
  {id}
  class={panelClass}
  {style}
  role="dialog"
  aria-modal="true"
  aria-label={ariaLabel ?? title}
>
  <div class="map-chrome-panel-header">
    <span>{title}</span>
    <button
      type="button"
      class="map-chrome-panel-close"
      aria-label="Close"
      onclick={onclose}
    >
      <X size={16} aria-hidden="true" />
    </button>
  </div>
  <div class="map-chrome-panel-body">
    {@render children?.()}
  </div>
</div>
