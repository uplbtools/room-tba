<script lang="ts">
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import { buildingLandmarkImages } from "@lib/landmark-images";

  type Props = {
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

  const { imageUrl, name, lat, lon, panoId, captured }: Props = $props();

  const images = $derived(
    buildingLandmarkImages({
      name,
      imageUrl,
      lat,
      lon,
      panoId,
      googleKey: import.meta.env.PUBLIC_GOOGLE_MAPS_API_KEY,
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
    if (!captured || current?.source !== "street-view") return null;
    const [year, month] = captured.split("-");
    if (!year) return null;
    if (!month) return year;
    const date = new Date(Number(year), Number(month) - 1, 1);
    return Number.isNaN(date.getTime())
      ? captured
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
    background-color: hsla(0, 0%, 100%, 0.85);
    color: hsl(0, 0%, 20%);
    cursor: pointer;
    box-shadow: 0 1px 4px hsla(0, 0%, 0%, 0.3);
  }

  .building-photo__nav:hover {
    background-color: white;
  }

  .building-photo__nav:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
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
    color: #6b6265;
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
