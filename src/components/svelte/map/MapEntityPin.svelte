<script lang="ts">
  import Move from "@lucide/svelte/icons/move";
  import type { Snippet } from "svelte";

  type EntityPinTone = "building" | "dorm" | "privateDorm";
  type EntityPinSaveState = "idle" | "saving" | "saved" | "failed";

  type Props = {
    active?: boolean;
    children: Snippet;
    editable?: boolean;
    editing?: boolean;
    dimmed?: boolean;
    eventLinked?: boolean;
    hovered?: boolean;
    label: string;
    labelVisible?: boolean;
    /** Hide inline pin label while the shared EntityHoverPreview is shown for this pin. */
    previewSuppressed?: boolean;
    onpointerenter?: (event: PointerEvent) => void;
    onpointerleave?: (event: PointerEvent) => void;
    saveState?: EntityPinSaveState;
    tone?: EntityPinTone;
    /** Read mode: hover detail comes from EntityHoverPreview, not the pin label. */
    useCentralHoverPreview?: boolean;
  };

  let {
    active = false,
    children,
    editable = false,
    editing = false,
    dimmed = false,
    eventLinked = false,
    hovered = false,
    label,
    labelVisible = false,
    previewSuppressed = false,
    onpointerenter,
    onpointerleave,
    saveState = "idle",
    tone = "building",
    useCentralHoverPreview = false,
  }: Props = $props();

  /** With central hover preview, only the selected pin keeps an inline label. */
  const showPinLabel = $derived(
    useCentralHoverPreview
      ? active && !previewSuppressed
      : (labelVisible || active) && !previewSuppressed,
  );

  const statusLabel = $derived(
    saveState === "saving"
      ? "Saving"
      : saveState === "saved"
        ? "Saved"
        : saveState === "failed"
          ? "Failed"
          : null,
  );

  const showDragAffordance = $derived(
    editable && (hovered || editing || active || saveState !== "idle"),
  );
  const showExpandedPin = $derived(editable && showDragAffordance);
</script>

<div
  class="map-entity-pin"
  class:active
  class:building={tone === "building"}
  class:dorm={tone === "dorm"}
  class:private={tone === "privateDorm"}
  class:central-hover-preview={useCentralHoverPreview}
  class:editable={showExpandedPin}
  class:editing
  class:dimmed
  class:event-linked={eventLinked}
  class:hovered
  class:saving={saveState === "saving"}
  class:saved={saveState === "saved"}
  class:failed={saveState === "failed"}
  aria-label={label}
  {onpointerenter}
  {onpointerleave}
>
  <span class="pin-icon" aria-hidden="true">
    {@render children()}
  </span>
  {#if showDragAffordance}
    <span class="drag-handle" aria-hidden="true">
      <Move size={13} />
    </span>
  {/if}
  <div
    class="pin-label"
    class:active={showPinLabel}
    class:persistent={showPinLabel}
    aria-hidden="true"
  >
    {label}
    {#if statusLabel}
      <span class="pin-status">{statusLabel}</span>
    {/if}
  </div>
</div>

<style>
  .map-entity-pin {
    position: relative;
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 2px 0.25rem rgba(0, 0, 0, 0.3);
    color: white;
    cursor: pointer;
    line-height: 0;
    padding: 0.25rem;
    transition:
      transform 0.2s,
      scale 1.5s;
  }

  .map-entity-pin.building {
    background-color: hsl(5, 53%, 32%);
  }

  .map-entity-pin.dorm {
    background-color: hsl(170, 50%, 35%);
  }

  .map-entity-pin.private {
    background-color: hsl(25, 70%, 50%);
  }

  .map-entity-pin.active {
    z-index: 85;
  }

  .map-entity-pin.active::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    outline: 0.125rem solid hsl(5, 53%, 40%);
    outline-offset: 0.125rem;
  }

  .map-entity-pin.dorm.active::before {
    outline-color: hsl(170, 50%, 45%);
  }

  .map-entity-pin.private.active::before {
    outline-color: hsl(25, 70%, 60%);
  }

  .map-entity-pin.editable {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    border-radius: 999px;
    padding-right: 0.5rem;
    cursor: grab;
    touch-action: none;
  }

  .map-entity-pin.hovered {
    z-index: 82;
    transform: scale(1.08);
    box-shadow:
      0 0 0 0.2rem rgba(255, 255, 255, 0.9),
      0 4px 0.75rem rgba(0, 0, 0, 0.28);
  }

  .map-entity-pin.editing {
    z-index: 92;
    cursor: grabbing;
    transform: scale(1.14);
  }

  .map-entity-pin.saving {
    outline: 0.16rem solid hsl(45, 94%, 47%);
    outline-offset: 0.15rem;
  }

  .map-entity-pin.saved {
    outline: 0.16rem solid hsl(145, 63%, 42%);
    outline-offset: 0.15rem;
  }

  .map-entity-pin.failed {
    outline: 0.16rem solid hsl(0, 72%, 51%);
    outline-offset: 0.15rem;
  }

  .map-entity-pin.dimmed {
    opacity: 0.32;
    filter: grayscale(0.35);
  }

  .map-entity-pin.dimmed .pin-label {
    opacity: 0;
  }

  .map-entity-pin.dimmed:hover,
  .map-entity-pin.dimmed.active {
    opacity: 0.55;
  }

  .map-entity-pin.dimmed:not(.central-hover-preview):hover .pin-label,
  .map-entity-pin.dimmed.active .pin-label.persistent {
    opacity: 1;
  }

  .map-entity-pin.central-hover-preview .pin-label {
    opacity: 0;
  }

  .map-entity-pin.central-hover-preview.active .pin-label.active {
    opacity: 1;
  }

  .map-entity-pin.event-linked {
    box-shadow:
      0 0 0 0.22rem rgba(250, 204, 21, 0.8),
      0 2px 0.25rem rgba(0, 0, 0, 0.3);
  }

  .map-entity-pin.dimmed.event-linked {
    opacity: 1;
    filter: none;
  }

  .map-entity-pin:hover.building {
    background-color: hsl(5, 53%, 40%);
  }

  .map-entity-pin:hover.dorm {
    background-color: hsl(170, 50%, 45%);
  }

  .map-entity-pin:hover.private {
    background-color: hsl(25, 70%, 60%);
  }

  .drag-handle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    opacity: 0.92;
    pointer-events: none;
  }

  .pin-icon {
    display: inline-flex;
    line-height: 0;
  }

  .pin-label {
    position: absolute;
    bottom: calc(100% + 0.5rem);
    left: 50%;
    z-index: 1;
    width: max-content;
    border-radius: 0.5rem;
    background-color: white;
    color: black;
    line-height: initial;
    opacity: 0;
    padding: 0.25rem 0.75rem;
    pointer-events: none;
    transition: opacity 0.2s;
    translate: -50% 0;
  }

  .map-entity-pin.active.building .pin-label {
    background-color: hsl(5, 53%, 32%);
    color: white;
  }

  .map-entity-pin.active.dorm .pin-label {
    background-color: hsl(170, 50%, 35%);
    color: white;
  }

  .map-entity-pin.active.private .pin-label {
    background-color: hsl(25, 70%, 50%);
    color: white;
  }

  .map-entity-pin:not(.central-hover-preview):hover .pin-label,
  .map-entity-pin:not(.central-hover-preview) .pin-label.active,
  .map-entity-pin:not(.central-hover-preview) .pin-label.persistent {
    opacity: 1;
  }

  .pin-status {
    margin-left: 0.5rem;
    border-left: 1px solid currentColor;
    font-size: 0.6875rem;
    opacity: 0.85;
    padding-left: 0.5rem;
  }

  @media (max-width: 48rem) {
    .pin-label {
      max-width: min(11rem, calc(100vw - 1.5rem));
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
</style>
