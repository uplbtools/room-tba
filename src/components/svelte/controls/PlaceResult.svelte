<script lang="ts">
  import { queryStore } from "@lib/store.svelte";
  import { getAppData } from "@lib/context";
  import { placeCategoryLabel } from "@constants/place-categories";

  const appData = getAppData();
  const app = $derived(appData());
  const place = $derived(
    app.loaded
      ? (app.places.find((p) => p.name === queryStore.queryValue) ?? null)
      : null,
  );

  const mapsUrl = $derived(
    place?.lat != null && place?.lon != null
      ? `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lon}`
      : null,
  );
</script>

{#if place}
  <div class="entity-detail">
    <header class="entity-header">
      <h2 class="entity-header__title">{place.name}</h2>
      {#if placeCategoryLabel(place.category)}
        <span class="place-category-badge"
          >{placeCategoryLabel(place.category)}</span
        >
      {/if}
    </header>

    {#if place.description}
      <p class="place-description">{place.description}</p>
    {/if}

    <ul class="place-facts">
      {#if place.hours}
        <li><strong>Hours:</strong> {place.hours}</li>
      {/if}
      {#if mapsUrl}
        <li>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
            >Open in Google Maps</a
          >
        </li>
      {/if}
      {#if place.websiteLink}
        <li>
          <a href={place.websiteLink} target="_blank" rel="noopener noreferrer"
            >Website</a
          >
        </li>
      {/if}
      {#if place.facebookLink}
        <li>
          <a href={place.facebookLink} target="_blank" rel="noopener noreferrer"
            >Facebook</a
          >
        </li>
      {/if}
    </ul>
  </div>
{:else}
  <p class="place-empty">Select a place on the map to see details.</p>
{/if}

<style>
  @import "./entity-detail.css";

  .place-category-badge {
    display: inline-block;
    align-self: flex-start;
    padding: 0.125rem 0.5rem;
    border-radius: 999px;
    background: hsl(162, 45%, 92%);
    color: #0d7a5f;
    font-size: 0.6875rem;
    font-weight: 600;
  }
  .place-description {
    margin: 0.5rem 0;
    line-height: 1.4;
  }
  .place-facts {
    list-style: none;
    padding: 0;
    margin: 0.5rem 0 0;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }
  .place-empty {
    padding: 1rem;
    color: hsl(0, 0%, 45%);
  }
</style>
