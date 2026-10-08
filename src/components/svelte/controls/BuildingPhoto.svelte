<script lang="ts">
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import {
    landmarkImages,
    needsStreetViewLookup,
    type LandmarkKind,
  } from "@lib/landmark-images";
  import {
    lookupStreetView,
    type StreetViewPano,
  } from "@lib/street-view-lookup";

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
  // Panels are reused across buildings; a stale index past the end of a
  // shorter gallery would render nothing.
  $effect(() => {
    void name;
    index = 0;
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

  const prev = () => {
    index = (index - 1 + images.length) % images.length;
  };
  const next = () => {
    index = (index + 1) % images.length;
  };
</script>

{#if current}
  <figure class="building-photo">
    <div class="building-photo__frame">
      <img
        class="entity-image"
        src={current.src}
        alt={current.alt}
        width="640"
        height="360"
        loading="lazy"
        decoding="async"
        referrerpolicy="strict-origin-when-cross-origin"
      />
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
        <span class="building-photo__counter" aria-live="polite">
          {index + 1}/{images.length}
        </span>
      {/if}
    </div>
    {#if current.credit || capturedLabel}
      <figcaption class="building-photo__credit">
        {#if current.creditUrl}
          <a href={current.creditUrl} target="_blank" rel="noopener noreferrer">
            {current.credit}
          </a>
        {:else if current.credit}
          <span>{current.credit}</span>
        {/if}
        {#if capturedLabel}
          <span class="building-photo__date">{capturedLabel}</span>
        {/if}
      </figcaption>
    {/if}
  </figure>
{/if}

<style>
  .building-photo {
    margin: 0;
  }

  .building-photo__frame {
    position: relative;
  }

  .building-photo__nav {
    position: absolute;
    top: 50%;
    translate: 0 -50%;
    display: flex;
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
  }

  .building-photo__nav:hover {
    background-color: var(--theme-surface, white);
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

  .building-photo__counter {
    position: absolute;
    right: 0.375rem;
    bottom: 0.5rem;
    padding: 0.0625rem 0.375rem;
    border-radius: 0.5rem;
    background-color: hsla(0, 0%, 0%, 0.55);
    color: white;
    font-size: 0.6875rem;
    line-height: 1.4;
  }

  .building-photo__credit {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    justify-content: space-between;
    padding: 0.25rem 0.1rem 0;
    color: var(--theme-text-2, #6b6265);
    font-size: 0.6875rem;
    line-height: 1.3;
  }

  .building-photo__credit a {
    color: inherit;
  }

  /* The capture date matters here: campus imagery ranges from 2015 to 2026,
     and a decade-old photo of a since-renovated building misleads. */
  .building-photo__date {
    white-space: nowrap;
  }
</style>
