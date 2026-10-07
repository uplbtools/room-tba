<script lang="ts">
  import Move from "@lucide/svelte/icons/move";
  import type { Snippet } from "svelte";

  type EntityPinTone =
    | "building"
    | "dorm"
    | "privateDorm"
    | "organization"
    | "office"
    | "landmark"
    | "establishment";
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
    /** Hosts one of the user's planner classes: blue ring, label always on,
     * "Your class" tag. */
    myClass?: boolean;
    onclick?: (event: MouseEvent | KeyboardEvent) => void;
    /** Hide inline pin label while the shared EntityHoverPreview is shown for this pin. */
    previewSuppressed?: boolean;
    onpointerenter?: (event: PointerEvent) => void;
    onpointerleave?: (event: PointerEvent) => void;
    saveState?: EntityPinSaveState;
    /** Paid placement at the sponsor's real location (docs/ad-policy.md);
     * gold ring + always-visible "Sponsored" label. */
    sponsored?: boolean;
    /** In the user's Saved places: small gold star on the pin's shoulder. */
    starred?: boolean;
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
    myClass = false,
    onclick,
    previewSuppressed = false,
    onpointerenter,
    onpointerleave,
    saveState = "idle",
    sponsored = false,
    starred = false,
    tone = "building",
    useCentralHoverPreview = false,
  }: Props = $props();

  const showPinLabel = $derived(
    (labelVisible || active || sponsored || myClass) && !previewSuppressed,
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

  function handleKeydown(event: KeyboardEvent) {
    if (!onclick || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    onclick(event);
  }
</script>

<div
  class="map-entity-pin"
  class:active
  class:building={tone === "building"}
  class:dorm={tone === "dorm"}
  class:private={tone === "privateDorm"}
  class:organization={tone === "organization"}
  class:office={tone === "office"}
  class:landmark={tone === "landmark"}
  class:establishment={tone === "establishment"}
  class:central-hover-preview={useCentralHoverPreview}
  class:editable={showExpandedPin}
  class:editing
  class:dimmed
  class:event-linked={eventLinked}
  class:hovered
  class:preview-suppressed={previewSuppressed}
  class:saving={saveState === "saving"}
  class:saved={saveState === "saved"}
  class:failed={saveState === "failed"}
  class:sponsored
  class:my-class={myClass}
  aria-label={[
    label,
    starred && "saved",
    myClass && "your class",
    sponsored && "sponsored",
  ]
    .filter(Boolean)
    .join(", ")}
  role={onclick ? "button" : undefined}
  tabindex={onclick ? 0 : undefined}
  {onclick}
  onkeydown={handleKeydown}
  {onpointerenter}
  {onpointerleave}
>
  <span class="pin-icon" aria-hidden="true">
    {@render children()}
  </span>
  {#if starred}
    <span class="pin-star" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="9" height="9">
        <path
          fill="currentColor"
          d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z"
        />
      </svg>
    </span>
  {/if}
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
    {#if sponsored}
      <span class="pin-status pin-sponsored">Sponsored</span>
    {:else if myClass}
      <span class="pin-status pin-my-class">Your class</span>
    {/if}
    {#if statusLabel}
      <span class="pin-status">{statusLabel}</span>
    {/if}
  </div>
</div>

<style>
  /* With 3D terrain on, MapLibre fades a marker to 0.2 (inline style) when
     its DEM depth test says a hill covers it. Close in and tilted that test
     misfires on campus, so pins seemed to vanish at high zoom. Place pins
     stay solid, like Google Maps. */
  :global(.maplibregl-marker.maplibregl-marker-covered:has(.map-entity-pin)) {
    /* biome-ignore lint/complexity/noImportantStyles: beats MapLibre's inline opacity */
    opacity: 1 !important;
  }

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

  .map-entity-pin.organization {
    background-color: hsl(265, 45%, 48%);
  }

  .map-entity-pin.office {
    background-color: hsl(208, 52%, 42%);
  }

  .map-entity-pin.landmark {
    background-color: hsl(34, 62%, 42%);
  }

  .map-entity-pin.establishment {
    background-color: hsl(334, 54%, 43%);
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

  .map-entity-pin.organization.active::before {
    outline-color: hsl(265, 45%, 58%);
  }

  .map-entity-pin.office.active::before {
    outline-color: hsl(208, 52%, 52%);
  }

  .map-entity-pin.landmark.active::before {
    outline-color: hsl(34, 62%, 52%);
  }

  .map-entity-pin.establishment.active::before {
    outline-color: hsl(334, 54%, 53%);
  }

  .map-entity-pin:hover.organization {
    background-color: hsl(265, 45%, 58%);
  }

  .map-entity-pin:hover.office {
    background-color: hsl(208, 52%, 52%);
  }

  .map-entity-pin:hover.landmark {
    background-color: hsl(34, 62%, 52%);
  }

  .map-entity-pin:hover.establishment {
    background-color: hsl(334, 54%, 53%);
  }

  .map-entity-pin.active.organization .pin-label {
    background-color: hsl(265, 45%, 48%);
    color: white;
  }

  .map-entity-pin.active.office .pin-label {
    background-color: hsl(208, 52%, 42%);
    color: white;
  }

  .map-entity-pin.active.landmark .pin-label {
    background-color: hsl(34, 62%, 42%);
    color: white;
  }

  .map-entity-pin.active.establishment .pin-label {
    background-color: hsl(334, 54%, 43%);
    color: white;
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

  .map-entity-pin.preview-suppressed .pin-label {
    opacity: 0;
  }

  .map-entity-pin.event-linked {
    box-shadow:
      0 0 0 0.22rem rgba(250, 204, 21, 0.8),
      0 2px 0.25rem rgba(0, 0, 0, 0.3);
  }

  /* Static gold ring — calm, no animation (editor UX rules). Elevated so
     neighboring pins don't bury the paid placement; active (85) still wins. */
  .map-entity-pin.sponsored {
    z-index: 84;
    box-shadow:
      0 0 0 0.22rem hsl(42, 65%, 52%),
      0 2px 0.25rem rgba(0, 0, 0, 0.3);
  }

  .pin-sponsored {
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 0.625rem;
    color: hsl(42, 65%, 32%);
  }

  .map-entity-pin.my-class {
    z-index: 83;
    box-shadow:
      0 0 0 0.22rem hsl(214, 80%, 48%),
      0 2px 0.25rem rgba(0, 0, 0, 0.3);
  }

  .pin-my-class {
    color: hsl(214, 80%, 38%);
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

  .pin-star {
    position: absolute;
    top: -0.375rem;
    right: -0.375rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 0.875rem;
    height: 0.875rem;
    border: 1.5px solid white;
    border-radius: 50%;
    background: hsl(42, 90%, 48%);
    color: white;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    pointer-events: none;
  }

  /* Place name beside the pin, Google Maps style: tinted text on a white
     halo rather than a card, so a map full of names stays readable. Right
     of the pin by default; Map.svelte's collision pass moves it to the left,
     below or above (pin-label--*) when the right side is taken. */
  .pin-label {
    position: absolute;
    top: 50%;
    left: calc(100% + 0.25rem);
    z-index: 1;
    width: max-content;
    max-width: 10rem;
    color: var(--pin-label-color, hsl(5, 53%, 28%));
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1.2;
    opacity: 0;
    padding: 0;
    pointer-events: none;
    text-shadow:
      0 0 2px #fff,
      0 0 2px #fff,
      0 0 3px #fff,
      0 0 4px #fff;
    transition: opacity 0.2s;
    translate: 0 -50%;
  }

  .pin-label:global(.pin-label--left) {
    left: auto;
    right: calc(100% + 0.25rem);
    text-align: right;
  }

  .pin-label:global(.pin-label--bottom),
  .pin-label:global(.pin-label--top) {
    left: 50%;
    text-align: center;
    translate: -50% 0;
  }

  .pin-label:global(.pin-label--bottom) {
    top: calc(100% + 0.25rem);
  }

  .pin-label:global(.pin-label--top) {
    top: auto;
    bottom: calc(100% + 0.25rem);
  }

  .map-entity-pin.dorm {
    --pin-label-color: hsl(170, 55%, 24%);
  }

  .map-entity-pin.private {
    --pin-label-color: hsl(25, 75%, 32%);
  }

  .map-entity-pin.organization {
    --pin-label-color: hsl(265, 45%, 38%);
  }

  .map-entity-pin.office {
    --pin-label-color: hsl(208, 55%, 32%);
  }

  .map-entity-pin.landmark {
    --pin-label-color: hsl(34, 70%, 28%);
  }

  .map-entity-pin.establishment {
    --pin-label-color: hsl(334, 54%, 35%);
  }

  /* The selected place keeps a filled name card so it stands out. */
  .map-entity-pin.active .pin-label {
    max-width: none;
    padding: 0.25rem 0.75rem;
    border-radius: 0.5rem;
    background-color: white;
    color: black;
    font-size: 0.875rem;
    text-shadow: none;
    box-shadow: 0 1px 4px rgb(0 0 0 / 0.2);
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

  /* Set by Map.svelte's label declutter pass; hover still reveals it. */
  .map-entity-pin:not(:hover) .pin-label:global(.pin-label--collided) {
    visibility: hidden;
  }

  .map-entity-pin:not(.preview-suppressed):hover .pin-label,
  .map-entity-pin .pin-label.active,
  .map-entity-pin .pin-label.persistent {
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
    .map-entity-pin.active .pin-label {
      max-width: min(11rem, calc(100vw - 1.5rem));
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
</style>
