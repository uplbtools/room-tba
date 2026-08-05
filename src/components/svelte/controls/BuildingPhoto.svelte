<script lang="ts">
  import {
    hasStreetViewKey,
    streetViewImageUrl,
    STREET_VIEW_ATTRIBUTION,
  } from "@lib/street-view";

  type Props = {
    /** Contributor-uploaded photo, stored in R2. Always wins when present. */
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

  const key = import.meta.env.PUBLIC_GOOGLE_MAPS_API_KEY;

  /**
   * A contributor photo beats Street View: it is ours, it is current, and it
   * is chosen to show the entrance rather than whatever the car happened to
   * face. Street View is the fallback for the buildings nobody has photographed.
   */
  const streetView = $derived.by(() => {
    if (imageUrl) return null;
    if (!hasStreetViewKey(key)) return null;
    // panoId comes from the cached lookup, so no request is made for a
    // building with no coverage. Without it Google bills for a grey
    // "no imagery" placeholder.
    if (!panoId || lat == null || lon == null) return null;
    return streetViewImageUrl({ lat: Number(lat), lng: Number(lon) }, key, {
      width: 640,
      height: 360,
      // Wider than the default so more of the frontage fits, and enough radius
      // to reach buildings set back from the road.
      fov: 90,
      radius: 100,
    });
  });

  /** "2026-02" reads as a date, not a version. */
  const capturedLabel = $derived.by(() => {
    if (!captured) return null;
    const [year, month] = captured.split("-");
    if (!year) return null;
    if (!month) return year;
    const date = new Date(Number(year), Number(month) - 1, 1);
    return Number.isNaN(date.getTime())
      ? captured
      : date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  });
</script>

{#if imageUrl}
  <img
    class="entity-image"
    src={imageUrl}
    alt={name}
    width="800"
    height="450"
    loading="lazy"
    decoding="async"
  />
{:else if streetView}
  <figure class="building-photo">
    <img
      class="entity-image"
      src={streetView}
      alt="Street View of {name}"
      width="640"
      height="360"
      loading="lazy"
      decoding="async"
      referrerpolicy="strict-origin-when-cross-origin"
    />
    <figcaption class="building-photo__credit">
      <span>{STREET_VIEW_ATTRIBUTION}</span>
      {#if capturedLabel}
        <span class="building-photo__date">{capturedLabel}</span>
      {/if}
    </figcaption>
  </figure>
{/if}

<style>
  .building-photo {
    margin: 0;
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

  /* The capture date matters here: campus imagery ranges from 2015 to 2026,
     and a decade-old photo of a since-renovated building misleads. */
  .building-photo__date {
    white-space: nowrap;
  }
</style>
