<script lang="ts">
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import X from "@lucide/svelte/icons/x";
  import {
    landmarkImages,
    needsStreetViewLookup,
    type LandmarkKind,
  } from "@lib/landmark-images";
  import {
    lookupStreetView,
    type StreetViewPano,
  } from "@lib/street-view-lookup";
  import { getGoogleStreetViewUrl } from "@lib/google-maps-links";
  import { trackOverlay } from "@lib/track-overlay.svelte";

  type Props = {
    /** Manifest key prefix; the gallery serves dorms, places and orgs too. */
    kind?: LandmarkKind;
    /** Contributor-uploaded photo, stored in R2. Always shown first. */
    imageUrl?: string | null;
    name: string;
    lat?: number | null;
    lon?: number | null;
    /** Cached Street View lookup (migration 0052). Null means no coverage. */
    panoId?: string | null;
    /** Capture month, "2026-02". Some campus imagery is a decade old. */
    captured?: string | null;
  };

  const { kind, imageUrl, name, lat, lon, panoId, captured }: Props =
    $props();

  const googleKey = $derived(import.meta.env.PUBLIC_GOOGLE_MAPS_API_KEY);

  // No manifest entry (food spots, stores, newer dorms): one cached metadata
  // request when the sheet opens, so the image only loads for a real pano.
  let lookedUpPano = $state<StreetViewPano | null>(null);
  $effect(() => {
    lookedUpPano = null;
    const input = { kind, name, lat, lon, panoId, googleKey };
    if (!needsStreetViewLookup(input)) return;
    let live = true;
    void lookupStreetView(
      { lat: Number(lat), lng: Number(lon) },
      googleKey as string,
    ).then((pano) => {
      if (live) lookedUpPano = pano;
    });
    return () => {
      live = false;
    };
  });

  const images = $derived(
    landmarkImages({
      kind,
      name,
      imageUrl,
      lat,
      lon,
      panoId,
      googleKey,
      lookedUpPano,
    }),
  );

  let index = $state(0);
  let viewerOpen = $state(false);
  // Panels are reused across buildings; a stale index past the end of a
  // shorter gallery would render nothing.
  $effect(() => {
    void name;
    index = 0;
    viewerOpen = false;
  });

  const current = $derived(images[Math.min(index, images.length - 1)]);

  /** "2026-02" reads as a date, not a version. */
  const capturedLabel = $derived.by(() => {
    const month = captured ?? lookedUpPano?.date;
    if (!month || current?.source !== "street-view") return null;
    const [y, m] = month.split("-");
    if (!y) return null;
    if (!m) return y;
    const date = new Date(Number(y), Number(m) - 1, 1);
    return Number.isNaN(date.getTime())
      ? month
      : date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  });

  /**
   * The one credit line. Street View's own image already carries Google's
   * logo and "© Google", so the caption says what it is and when it was
   * taken; only an uploader's name (a photo sphere somebody shared) adds a
   * credit of its own.
   */
  const creditText = $derived.by(() => {
    if (!current) return null;
    if (current.source !== "street-view") return current.credit ?? null;
    const owner = current.credit
      ?.replace(/^Street View image\s*/i, "")
      .trim();
    return owner && !/google/i.test(owner)
      ? `Street View, ${owner}`
      : "Street View";
  });

  /** Where "Open in Google Maps Street View" goes: the pinned pano, else the pin. */
  const streetViewHref = $derived.by(() => {
    if (current?.source !== "street-view") return null;
    let pano: string | null = null;
    try {
      pano = new URL(current.src).searchParams.get("pano");
    } catch {
      pano = null;
    }
    if (pano) {
      return `https://www.google.com/maps/@?api=1&map_action=pano&pano=${encodeURIComponent(pano)}`;
    }
    return lat != null && lon != null
      ? getGoogleStreetViewUrl(Number(lat), Number(lon))
      : null;
  });

  const prev = () => {
    index = (index - 1 + images.length) % images.length;
  };
  const next = () => {
    index = (index + 1) % images.length;
  };

  // Swipe the photo sideways like any carousel; a plain tap opens it full
  // screen. Vertical drags stay with the sheet (touch-action: pan-y).
  const SWIPE_PX = 36;
  let swipeStartX: number | null = null;
  let swiped = false;

  function onPointerDown(event: PointerEvent) {
    swipeStartX = event.clientX;
    swiped = false;
  }

  function onPointerUp(event: PointerEvent) {
    if (swipeStartX === null) return;
    const dx = event.clientX - swipeStartX;
    swipeStartX = null;
    if (images.length > 1 && Math.abs(dx) >= SWIPE_PX) {
      swiped = true;
      if (dx < 0) next();
      else prev();
    }
  }

  function onPhotoClick() {
    if (swiped) {
      swiped = false;
      return;
    }
    viewerOpen = true;
  }

  let viewerEl = $state<HTMLDialogElement | null>(null);

  $effect(() => {
    const dialog = viewerEl;
    if (!dialog) return;
    if (viewerOpen && !dialog.open) dialog.showModal();
    else if (!viewerOpen && dialog.open) dialog.close();
  });

  // Back closes the viewer before it leaves the place.
  trackOverlay(
    "photo-viewer",
    () => viewerOpen,
    () => {
      viewerOpen = false;
    },
  );

  function onViewerKey(event: KeyboardEvent) {
    // Esc closes only the viewer (the dialog does that itself). The app's
    // window-level Esc would also close the place sheet behind it.
    if (event.key === "Escape") {
      event.stopPropagation();
      return;
    }
    if (images.length < 2) return;
    if (event.key === "ArrowLeft") prev();
    else if (event.key === "ArrowRight") next();
  }
</script>

{#if current}
  <figure class="building-photo">
    <div class="building-photo__frame">
      <button
        type="button"
        class="building-photo__open"
        aria-label="View {name} photo full screen"
        onpointerdown={onPointerDown}
        onpointerup={onPointerUp}
        onpointercancel={() => (swipeStartX = null)}
        onclick={onPhotoClick}
      >
        <img
          class="building-photo__img"
          src={current.src}
          alt={current.alt}
          width="640"
          height="360"
          loading="lazy"
          decoding="async"
          draggable="false"
          referrerpolicy="strict-origin-when-cross-origin"
        />
      </button>
      {#if images.length > 1}
        <button
          type="button"
          class="building-photo__nav building-photo__nav--prev"
          onclick={prev}
          aria-label="Previous photo of {name}"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          class="building-photo__nav building-photo__nav--next"
          onclick={next}
          aria-label="Next photo of {name}"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      {/if}
    </div>
    {#if images.length > 1}
      <div class="building-photo__dots" role="group" aria-label="Photos">
        {#each images as _image, i (i)}
          <button
            type="button"
            class="building-photo__dot"
            class:building-photo__dot--on={i === Math.min(index, images.length - 1)}
            aria-label="Photo {i + 1} of {images.length}"
            aria-current={i === Math.min(index, images.length - 1)
              ? "true"
              : undefined}
            onclick={() => (index = i)}
          ></button>
        {/each}
      </div>
    {/if}
    {#if creditText || capturedLabel || streetViewHref}
      <figcaption class="building-photo__credit">
        <span class="building-photo__credit-text">
          {#if current.creditUrl}
            <a
              href={current.creditUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {creditText}
            </a>
          {:else if creditText}
            <span>{creditText}</span>
          {/if}
          {#if capturedLabel}
            <span class="building-photo__date">{capturedLabel}</span>
          {/if}
        </span>
        {#if streetViewHref}
          <a
            class="building-photo__streetview"
            href={streetViewHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in Google Maps Street View
            <ExternalLink size={12} aria-hidden="true" />
          </a>
        {/if}
      </figcaption>
    {/if}
  </figure>

  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <dialog
    bind:this={viewerEl}
    class="building-photo__viewer"
    aria-label="{name} photos"
    onclose={() => (viewerOpen = false)}
    onkeydown={onViewerKey}
  >
    {#if viewerOpen}
      <button
        type="button"
        class="building-photo__viewer-close"
        aria-label="Close photo viewer"
        onclick={() => (viewerOpen = false)}
      >
        <X size={22} aria-hidden="true" />
      </button>
      <img
        class="building-photo__viewer-img"
        src={current.src}
        alt={current.alt}
        referrerpolicy="strict-origin-when-cross-origin"
      />
      {#if images.length > 1}
        <button
          type="button"
          class="building-photo__viewer-nav building-photo__viewer-nav--prev"
          onclick={prev}
          aria-label="Previous photo"
        >
          <ChevronLeft size={24} aria-hidden="true" />
        </button>
        <button
          type="button"
          class="building-photo__viewer-nav building-photo__viewer-nav--next"
          onclick={next}
          aria-label="Next photo"
        >
          <ChevronRight size={24} aria-hidden="true" />
        </button>
      {/if}
      <div class="building-photo__viewer-bar">
        <span>
          {creditText ?? name}{capturedLabel ? `, ${capturedLabel}` : ""}
          {#if images.length > 1}
            <span class="building-photo__viewer-count"
              >Photo {Math.min(index, images.length - 1) + 1} of {images.length}</span
            >
          {/if}
        </span>
        {#if streetViewHref}
          <a href={streetViewHref} target="_blank" rel="noopener noreferrer">
            Open in Google Maps Street View
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        {/if}
      </div>
    {/if}
  </dialog>
{/if}

<style>
  .building-photo {
    margin: 0;
  }

  .building-photo__frame {
    position: relative;
  }

  .building-photo__open {
    display: block;
    width: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden;
    border: 1px solid var(--theme-border, hsl(5, 20%, 86%));
    border-radius: 0.75rem;
    background: var(--theme-surface-2, #f4f4f5);
    cursor: zoom-in;
    /* Sideways swipes belong to the carousel, vertical ones to the sheet. */
    touch-action: pan-y;
    -webkit-tap-highlight-color: transparent;
  }

  .building-photo__open:focus-visible {
    outline: 3px solid var(--theme-accent-text, hsl(5, 53%, 32%));
    outline-offset: 2px;
  }

  .building-photo__img {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 9;
    max-height: 12rem;
    object-fit: cover;
    user-select: none;
  }

  /* Arrows are a mouse aid: touch swipes, and the dots show where you are. */
  .building-photo__nav {
    position: absolute;
    top: 50%;
    translate: 0 -50%;
    display: none;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    padding: 0;
    border: none;
    border-radius: 50%;
    background-color: var(--theme-surface-translucent, hsla(0, 0%, 100%, 0.85));
    color: var(--theme-text, hsl(0, 0%, 20%));
    cursor: pointer;
    box-shadow: 0 1px 4px hsla(0, 0%, 0%, 0.3);
    opacity: 0;
    transition: opacity 0.15s;
  }

  @media (hover: hover) and (pointer: fine) {
    .building-photo__nav {
      display: flex;
    }

    .building-photo__frame:hover .building-photo__nav,
    .building-photo__nav:focus-visible {
      opacity: 1;
    }
  }

  .building-photo__nav:focus-visible {
    outline: 2px solid var(--theme-accent-text, hsl(5, 53%, 32%));
    outline-offset: 1px;
  }

  .building-photo__nav--prev {
    left: 0.375rem;
  }

  .building-photo__nav--next {
    right: 0.375rem;
  }

  .building-photo__dots {
    display: flex;
    justify-content: center;
    gap: 0;
    padding-top: 0.125rem;
  }

  /* 24px hit area around an 8px dot. */
  .building-photo__dot {
    position: relative;
    width: 1.5rem;
    height: 1.5rem;
    margin: 0;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
  }

  .building-photo__dot::after {
    content: "";
    position: absolute;
    inset: 50% auto auto 50%;
    width: 0.5rem;
    height: 0.5rem;
    translate: -50% -50%;
    border-radius: 50%;
    background: var(--theme-border-strong, hsl(0, 0%, 52%));
    transition:
      background-color 0.15s,
      scale 0.15s;
  }

  .building-photo__dot--on::after {
    background: var(--theme-accent-text, hsl(5, 53%, 32%));
    scale: 1.25;
  }

  .building-photo__dot:focus-visible {
    outline: 2px solid var(--theme-accent-text, hsl(5, 53%, 32%));
    outline-offset: -2px;
    border-radius: 50%;
  }

  .building-photo__credit {
    display: flex;
    flex-wrap: wrap;
    gap: 0.125rem 0.75rem;
    justify-content: space-between;
    padding: 0.125rem 0.125rem 0;
    color: var(--theme-text-2, #6b6265);
    font-size: 0.75rem;
    line-height: 1.35;
  }

  .building-photo__credit a {
    color: inherit;
  }

  .building-photo__credit-text {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0 0.5rem;
  }

  .building-photo__streetview {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
    font-weight: 600;
    text-underline-offset: 2px;
  }

  /* The capture date matters here: campus imagery ranges from 2015 to 2026,
     and a decade-old photo of a since-renovated building misleads. */
  .building-photo__date {
    white-space: nowrap;
  }

  .building-photo__viewer {
    width: 100vw;
    max-width: none;
    height: 100dvh;
    max-height: none;
    margin: 0;
    padding: 0;
    border: 0;
    background: #0b0b0c;
    color: #fff;
    overflow: hidden;
  }

  .building-photo__viewer::backdrop {
    background: rgb(0 0 0 / 90%);
  }

  .building-photo__viewer-img {
    display: block;
    width: 100%;
    height: calc(100dvh - 4.5rem);
    margin-top: 0;
    object-fit: contain;
  }

  .building-photo__viewer-close,
  .building-photo__viewer-nav {
    position: absolute;
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: rgb(24 24 27 / 78%);
    color: #fff;
    cursor: pointer;
  }

  .building-photo__viewer-close {
    top: max(0.75rem, env(safe-area-inset-top, 0px));
    right: 0.75rem;
  }

  .building-photo__viewer-nav {
    top: calc(50% - 2.25rem);
  }

  .building-photo__viewer-nav--prev {
    left: 0.5rem;
  }

  .building-photo__viewer-nav--next {
    right: 0.5rem;
  }

  .building-photo__viewer-close:focus-visible,
  .building-photo__viewer-nav:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 2px;
  }

  .building-photo__viewer-bar {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.25rem 1rem;
    min-height: 4.5rem;
    padding: 0.75rem 1rem max(0.75rem, env(safe-area-inset-bottom, 0px));
    font-size: 0.875rem;
    line-height: 1.4;
  }

  .building-photo__viewer-bar a {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: #fff;
    font-weight: 600;
    text-underline-offset: 2px;
  }

  .building-photo__viewer-count {
    display: block;
    color: rgb(255 255 255 / 72%);
    font-size: 0.75rem;
  }

  @media (prefers-reduced-motion: reduce) {
    .building-photo__nav,
    .building-photo__dot::after {
      transition: none;
    }
  }
</style>
