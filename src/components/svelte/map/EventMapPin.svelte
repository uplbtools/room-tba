<script lang="ts">
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import { fade } from "svelte/transition";

  type EventPinVariant = "single" | "group";

  type Props = {
    active?: boolean;
    anchored?: boolean;
    ariaExpanded?: boolean;
    ariaLabel: string;
    count?: number;
    dateLabel: string;
    expanded?: boolean;
    imageSrc?: string | null;
    labelMeta?: string;
    labelTitle?: string;
    labelVisible?: boolean;
    onclick: () => void;
    onpointerenter?: (event: PointerEvent) => void;
    onpointerleave?: (event: PointerEvent) => void;
    previewSuppressed?: boolean;
    status?: string;
    title?: string;
    variant?: EventPinVariant;
    /** Read mode: hover detail comes from EntityHoverPreview, not the pin label. */
    useCentralHoverPreview?: boolean;
  };

  let {
    active = false,
    anchored = false,
    ariaExpanded,
    ariaLabel,
    count = 0,
    dateLabel,
    expanded = false,
    imageSrc = null,
    labelMeta,
    labelTitle,
    labelVisible = false,
    onclick,
    onpointerenter,
    onpointerleave,
    previewSuppressed = false,
    status = "active",
    title,
    variant = "single",
    useCentralHoverPreview = false,
  }: Props = $props();

  const isGroup = $derived(variant === "group");
  const showInlineLabel = $derived(
    !isGroup && labelTitle && (labelVisible || active) && !previewSuppressed,
  );
  const showInlineMeta = $derived(!useCentralHoverPreview || active);
</script>

<button
  type="button"
  class="event-map-pin"
  class:active
  class:anchored
  class:expanded
  class:group={isGroup}
  class:preview-suppressed={previewSuppressed}
  class:past={status === "past"}
  class:upcoming={status === "upcoming"}
  title={useCentralHoverPreview ? undefined : title}
  aria-label={ariaLabel}
  aria-expanded={isGroup ? ariaExpanded : undefined}
  {onclick}
  {onpointerenter}
  {onpointerleave}
>
  {#if imageSrc}
    <img class="event-pin-media" src={imageSrc} alt="" width="40" height="40" loading="lazy" decoding="async" />
  {:else}
    <span class="event-pin-icon" aria-hidden="true">
      <CalendarDays size={14} />
    </span>
  {/if}
  <span class="event-date-badge" aria-hidden="true">{dateLabel}</span>

  {#if isGroup}
    <span class="event-count-badge">{count}</span>
    <span class="event-pin-chevron" aria-hidden="true">
      <ChevronDown size={12} />
    </span>
  {:else if showInlineLabel}
    <span
      class="event-pin-label"
      class:active
      class:title-only={useCentralHoverPreview && labelVisible && !active}
      transition:fade
      aria-hidden="true"
    >
      <span class="event-pin-title">{labelTitle}</span>
      {#if showInlineMeta && labelMeta}
        <span class="event-pin-meta">{labelMeta}</span>
      {/if}
    </span>
  {/if}
</button>

<style>
  .event-map-pin {
    all: unset;
    position: relative;
    display: inline-flex;
    box-sizing: border-box;
    width: 2.15rem;
    height: 2.15rem;
    align-items: center;
    justify-content: center;
    border: 2px solid white;
    border-radius: 999px;
    background: #7b1113;
    color: white;
    cursor: pointer;
    line-height: 1;
    box-shadow:
      0 0 0 0.14rem rgba(123, 17, 19, 0.24),
      0 0.32rem 0.7rem rgba(0, 0, 0, 0.28);
    transform-origin: bottom center;
  }

  .event-map-pin::before {
    content: "";
    position: absolute;
    inset: -0.35rem;
    border-radius: 999px;
  }

  .event-map-pin::after {
    content: "";
    position: absolute;
    top: calc(100% - 0.18rem);
    left: 50%;
    width: 0.45rem;
    height: 0.45rem;
    border-right: 2px solid white;
    border-bottom: 2px solid white;
    background: inherit;
    pointer-events: none;
    rotate: 45deg;
    translate: -50% 0;
  }

  .event-map-pin.anchored::after {
    display: none;
  }

  .event-map-pin.upcoming,
  .event-map-pin.group {
    border-color: #d8b9ba;
    background: #f8fafc;
    color: #7b1113;
  }

  .event-map-pin.past {
    border-color: #d4d4d8;
    background: #f4f4f5;
    color: #71717a;
    opacity: 0.92;
  }

  .event-map-pin.active,
  .event-map-pin.expanded {
    transform: scale(1.06);
    box-shadow:
      0 0 0 0.16rem rgba(250, 204, 21, 0.88),
      0 0.42rem 0.82rem rgba(0, 0, 0, 0.3);
  }

  .event-map-pin:hover,
  .event-map-pin:focus-visible {
    transform: scale(1.06);
  }

  .event-map-pin:focus-visible {
    outline: 2px solid #7b1113;
    outline-offset: 0.22rem;
  }

  .event-pin-media,
  .event-pin-icon {
    width: 1.58rem;
    height: 1.58rem;
    border-radius: 999px;
  }

  .event-pin-media {
    object-fit: contain;
    background: hsl(0, 0%, 96%);
    object-position: top center;
  }

  .event-pin-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.18);
  }

  .event-map-pin.upcoming .event-pin-icon,
  .event-map-pin.group .event-pin-icon {
    background: rgba(123, 17, 19, 0.12);
  }

  .event-date-badge {
    position: absolute;
    right: -0.48rem;
    bottom: -0.28rem;
    display: inline-flex;
    min-width: 1.65rem;
    height: 0.92rem;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(123, 17, 19, 0.24);
    border-radius: 999px;
    background: white;
    color: #7b1113;
    font-size: 0.54rem;
    font-weight: 900;
    letter-spacing: -0.025em;
    padding-inline: 0.16rem;
    pointer-events: none;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .event-count-badge {
    position: absolute;
    top: -0.38rem;
    right: -0.38rem;
    display: inline-flex;
    min-width: 1.1rem;
    height: 1.1rem;
    align-items: center;
    justify-content: center;
    border: 2px solid white;
    border-radius: 999px;
    background: #7b1113;
    color: white;
    font-size: 0.62rem;
    font-weight: 900;
    padding: 0 0.16rem;
    pointer-events: none;
  }

  .event-pin-chevron {
    position: absolute;
    right: -0.32rem;
    top: 1.12rem;
    display: inline-flex;
    width: 0.95rem;
    height: 0.95rem;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(123, 17, 19, 0.24);
    border-radius: 999px;
    background: white;
    color: #7b1113;
    pointer-events: none;
    transition: transform 0.16s ease;
  }

  .event-map-pin.expanded .event-pin-chevron {
    transform: rotate(180deg);
  }

  .event-pin-label {
    position: absolute;
    bottom: calc(100% + 0.45rem);
    left: 50%;
    display: grid;
    width: max-content;
    max-width: min(15rem, calc(100vw - 2rem));
    gap: 0.14rem;
    border-radius: 0.7rem;
    background: white;
    box-shadow: 0 0.4rem 0.9rem rgba(0, 0, 0, 0.22);
    color: #18181b;
    opacity: 0;
    padding: 0.42rem 0.55rem;
    pointer-events: none;
    translate: -50% 0;
  }

  .event-map-pin:hover .event-pin-label,
  .event-map-pin:focus-visible .event-pin-label,
  .event-pin-label.active {
    opacity: 1;
  }

  .event-map-pin.preview-suppressed .event-pin-label {
    opacity: 0;
  }

  .event-pin-label.title-only {
    opacity: 1;
  }

  .event-pin-title {
    overflow: hidden;
    font-size: 0.76rem;
    font-weight: 900;
    line-height: 1.15;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .event-pin-meta {
    font-size: 0.62rem;
    font-weight: 800;
    line-height: 1;
    opacity: 0.86;
    text-transform: uppercase;
  }

  @media (max-width: 48rem) {
    .event-map-pin::before {
      inset: -0.55rem;
    }
  }
</style>
