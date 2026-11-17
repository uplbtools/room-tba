<script lang="ts">
  /**
   * The Makiling trail sheet (#716). Overview: an AllTrails-style summary,
   * the elevation profile, one "Before you go" briefing and every stop, all
   * in the sheet's single scroll, with a picker between the two trails. A
   * stop: its number, elevation, distance, what to know there, and Prev / Next
   * along the trail.
   */
  import { onDestroy, onMount } from "svelte";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import Crosshair from "@lucide/svelte/icons/crosshair";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Maximize from "@lucide/svelte/icons/maximize";
  import Mountain from "@lucide/svelte/icons/mountain";
  import MapChromeActionChip from "@ui/map-chrome/MapChromeActionChip.svelte";
  import EntityPanelClose from "@ui/controls/EntityPanelClose.svelte";
  import EntityDirectionsChip from "@ui/controls/EntityDirectionsChip.svelte";
  import EntityShareButton from "@ui/controls/EntityShareButton.svelte";
  import TrailElevationProfile from "./TrailElevationProfile.svelte";
  import { MAKILING_TRAIL_COLOR, MAKILING_TRAILS } from "@constants/makiling-trail";
  import { TERRAIN_ENABLED } from "@constants/map-terrain";
  import {
    findTrailStop,
    formatHours,
    formatKm,
    formatMeters,
    getTrail,
    getTrailStops,
    getTrailSummary,
    stationLabel,
    trailUrlValue,
  } from "@lib/makiling-trail";
  import { withAppState } from "@lib/app-url-state";
  import {
    directionsStore,
    queryStore,
    sidePanelStore,
    terrainStore,
    trailStore,
  } from "@lib/store.svelte";

  const trail = $derived(getTrail(trailStore.trailId));
  const summary = $derived(getTrailSummary(trail.id));
  const stops = $derived(getTrailStops(trail.id));
  const trailhead = $derived(stops[0]);

  const stop = $derived(findTrailStop(trailStore.selectedStopId));
  const stopIndex = $derived(stop ? stops.findIndex((s) => s.id === stop.id) : -1);
  const prevStop = $derived(stopIndex > 0 ? stops[stopIndex - 1] : null);
  const nextStop = $derived(
    stopIndex >= 0 && stopIndex < stops.length - 1 ? stops[stopIndex + 1] : null,
  );

  const shareUrl = $derived(
    typeof location === "undefined"
      ? ""
      : `${location.origin}${withAppState("/", {
          layers: "trail",
          trail: trailUrlValue(trail.id, stop?.id ?? null),
        })}`,
  );

  // The sheet is open while this panel is: a panel restored under it (after
  // directions) reopens the sheet state, and closing or replacing the panel
  // closes it. Directions borrows the panel slot without closing the trail.
  onMount(() => {
    if (!trailStore.sheetOpen) trailStore.openSheet(trailStore.selectedStopId);
  });
  onDestroy(() => {
    if (!directionsStore.active) trailStore.closeSheet();
  });

  function close() {
    trailStore.closeSheet();
    sidePanelStore.closePanel();
  }

  function selectStop(id: string) {
    trailStore.flyToStop(id);
  }

  function openPlace(name: string) {
    trailStore.closeSheet();
    sidePanelStore.closePanel();
    queryStore.updateQuery({ type: "result", category: "place", value: name });
  }

  function pickTrail(id: string) {
    trailStore.selectTrail(id);
    trailStore.requestFrame();
  }

  function distanceLine(meters: number, elevation: number) {
    return `${formatKm(meters)} from ${trail.startLabel}, ${formatMeters(elevation)}`;
  }
</script>

{#snippet closedNotice()}
  {#if trail.closed}
    <p class="trail-closed">
      {trail.closed.text} Check
      <a href={trail.closed.href} target="_blank" rel="noreferrer">{trail.closed.label}</a>
      for the opening announcement.
    </p>
  {/if}
{/snippet}

<div class="entity-detail trail-panel" style:--trail-color={MAKILING_TRAIL_COLOR}>
  {#if stop}
    <header class="entity-header">
      <button
        type="button"
        class="entity-header__breadcrumb"
        onclick={() => trailStore.selectStop(null)}
      >
        <ChevronLeft size={14} aria-hidden="true" />
        <span>{trail.name}</span>
      </button>
      <div class="entity-header__title-row entity-header__title-row--with-close">
        <h2 class="entity-header__title">{stop.name}</h2>
        {#if stationLabel(stop) && !stop.name.includes(stationLabel(stop) ?? "")}
          <span class="entity-header__badge trail-badge">{stationLabel(stop)}</span>
        {/if}
        <EntityPanelClose ariaLabel="Close trail" showOnMobile onclick={close} />
      </div>
      <dl class="trail-facts">
        <div>
          <dt>Elevation</dt>
          <dd>{formatMeters(stop.elevationMeters)}</dd>
        </div>
        <div>
          <dt>From {trail.startLabel}</dt>
          <dd>{formatKm(stop.distanceMeters)}</dd>
        </div>
        <div>
          <dt>To Peak 2</dt>
          <dd>{formatKm(summary.lengthMeters - stop.distanceMeters)}</dd>
        </div>
      </dl>
      <div class="entity-actions">
        {#if stop.placeName || stop.id === trailhead?.id}
          <EntityDirectionsChip
            primary={stop.id === trailhead?.id}
            lat={stop.lat}
            lon={stop.lon}
            destinationLabel={stop.placeName ?? stop.name}
          />
        {/if}
        <MapChromeActionChip toolbar onclick={() => trailStore.flyToStop(stop.id)}>
          <Crosshair size={14} aria-hidden="true" />
          Show on map
        </MapChromeActionChip>
        {#if stop.placeName || stop.sideTripPlaceName}
          {@const placeName = stop.placeName ?? stop.sideTripPlaceName ?? ""}
          <MapChromeActionChip toolbar onclick={() => openPlace(placeName)}>
            <MapPin size={14} aria-hidden="true" />
            {placeName === stop.placeName ? "Place details" : placeName}
          </MapChromeActionChip>
        {/if}
        <EntityShareButton url={shareUrl} entityLabel={stop.name} />
      </div>
    </header>
    {#if stop.description}
      <p class="trail-text">{stop.description}</p>
    {/if}
    {@render closedNotice()}
    <nav class="trail-stop-nav" aria-label="Stops along the trail">
      {#if prevStop}
        <button type="button" class="trail-stop-nav__btn" onclick={() => selectStop(prevStop.id)}>
          <ChevronLeft size={16} aria-hidden="true" />
          <span class="trail-stop-nav__text">
            <span class="trail-stop-nav__hint">Previous</span>
            <span>{prevStop.name}</span>
          </span>
        </button>
      {:else}
        <span></span>
      {/if}
      {#if nextStop}
        <button
          type="button"
          class="trail-stop-nav__btn trail-stop-nav__btn--next"
          onclick={() => selectStop(nextStop.id)}
        >
          <span class="trail-stop-nav__text">
            <span class="trail-stop-nav__hint">Next</span>
            <span>{nextStop.name}</span>
          </span>
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      {/if}
    </nav>
  {:else}
    <header class="entity-header">
      <div class="entity-header__title-row entity-header__title-row--with-close">
        <h2 class="entity-header__title">{trail.name}</h2>
        <EntityPanelClose ariaLabel="Close trail" showOnMobile onclick={close} />
      </div>
      <p class="trail-subtitle">{trail.subtitle}</p>
      <div class="trail-picker" role="group" aria-label="Trail">
        {#each MAKILING_TRAILS as item (item.id)}
          <button
            type="button"
            class="trail-picker__btn"
            aria-pressed={item.id === trail.id}
            onclick={() => pickTrail(item.id)}>{item.label}</button
          >
        {/each}
      </div>
      <dl class="trail-facts trail-facts--summary">
        <div>
          <dt>Length</dt>
          <dd>{formatKm(summary.hikeMeters)}</dd>
        </div>
        <div>
          <dt>Elevation gain</dt>
          <dd>{formatMeters(summary.gainMeters)}</dd>
        </div>
        <div>
          <dt>Route type</dt>
          <dd>{trail.oneWay ? "One way" : "Out and back"}</dd>
        </div>
        <div>
          <dt>Est. time</dt>
          <dd>{trail.estTime ?? formatHours(summary.naismithHours)}</dd>
        </div>
        {#if !trail.oneWay}
          <div>
            <dt>Difficulty</dt>
            <dd>{summary.difficulty}</dd>
          </div>
        {/if}
      </dl>
      <div class="entity-actions">
        {#if trailhead}
          <EntityDirectionsChip
            primary
            lat={trailhead.lat}
            lon={trailhead.lon}
            destinationLabel={trailhead.placeName ?? trailhead.name}
            label="Directions to trailhead"
          />
        {/if}
        <MapChromeActionChip toolbar onclick={() => trailStore.requestFrame()}>
          <Maximize size={14} aria-hidden="true" />
          Frame trail
        </MapChromeActionChip>
        {#if TERRAIN_ENABLED}
          <MapChromeActionChip
            toolbar
            pressed={terrainStore.enabled}
            onclick={() => terrainStore.toggle()}
          >
            <Mountain size={14} aria-hidden="true" />
            {terrainStore.enabled ? "Terrain on" : "Show terrain"}
          </MapChromeActionChip>
        {/if}
        <EntityShareButton url={shareUrl} entityLabel={trail.name} />
      </div>
    </header>

    {@render closedNotice()}

    <p class="trail-note">
      {#if trail.oneWay}
        The trail is {formatKm(summary.lengthMeters)} from {formatMeters(summary.startElevation)}
        at the trailhead to {formatMeters(summary.summitElevation)} at Peak 2. The time is from older
        guides (Pinoy Mountaineer, 2015).
      {:else}
        The trail is {formatKm(summary.lengthMeters)} each way, from {formatMeters(summary.startElevation)}
        at Station 1 to {formatMeters(summary.summitElevation)} at Peak 2. Time uses Naismith's
        rule (5 km per hour plus 1 hour per 600 m climbed). Mud and rest stops often add hours.
      {/if}
    </p>

    <section class="trail-section" aria-labelledby="trail-profile-heading">
      <h3 id="trail-profile-heading" class="trail-section__title">Elevation profile</h3>
      <TrailElevationProfile
        profile={summary.profile}
        {stops}
        startLabel={trail.startLabel}
      />
    </section>

    <section class="trail-section" aria-labelledby="trail-before-heading">
      <h3 id="trail-before-heading" class="trail-section__title">Before you go</h3>
      <ul class="trail-brief">
        {#each trail.beforeYouGo as item (item.title)}
          <li>
            <strong>{item.title}</strong>
            <span>{item.body}</span>
          </li>
        {/each}
      </ul>
      <p class="trail-note">
        {trail.source.text}
        <a href={trail.source.href} target="_blank" rel="noreferrer">{trail.source.label}</a>.
        Confirm with MCME before your hike. This map is for planning, not navigation.
      </p>
    </section>

    <section class="trail-section" aria-labelledby="trail-stops-heading">
      <h3 id="trail-stops-heading" class="trail-section__title">
        {stops.some((item) => item.station !== null) ? "Stations" : "Stops"}
      </h3>
      <ol class="trail-stops">
        {#each stops as item (item.id)}
          <li>
            <button type="button" class="trail-stop" onclick={() => selectStop(item.id)}>
              <span class="trail-stop__num" class:trail-stop__num--named={item.station === null}>
                {#if item.station !== null}
                  {item.station}
                {:else}
                  <MapPin size={13} aria-hidden="true" />
                {/if}
              </span>
              <span class="trail-stop__text">
                <span class="trail-stop__name">{item.name}</span>
                <span class="trail-stop__meta">
                  {distanceLine(item.distanceMeters, item.elevationMeters)}
                </span>
              </span>
              <ChevronRight size={16} aria-hidden="true" class="trail-stop__chevron" />
            </button>
          </li>
        {/each}
      </ol>
    </section>

    <p class="trail-source">
      Trail line and stations are from
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer"
        >(c) OpenStreetMap contributors</a
      > (ODbL). Elevations are from Terrain Tiles (Mapzen, AWS Open Data) and accurate to about 10 m.
    </p>
  {/if}
</div>

<style>
  @import "../controls/entity-detail.css";

  .trail-panel {
    gap: 0.75rem;
  }

  .trail-badge {
    background: color-mix(in srgb, var(--trail-color) 14%, transparent);
    color: var(--theme-green-text, #166534);
  }

  .trail-picker {
    display: flex;
    padding: 0.1875rem;
    border-radius: 999px;
    background: var(--theme-surface-2, hsl(0 0% 94%));
  }

  .trail-picker__btn {
    flex: 1 1 0;
    min-height: 2.25rem;
    padding: 0 0.75rem;
    border: none;
    border-radius: 999px;
    background: none;
    color: var(--theme-text, hsl(0 0% 28%));
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
  }

  .trail-picker__btn[aria-pressed="true"] {
    background: var(--theme-surface, white);
    color: var(--theme-green-text, #166534);
    box-shadow: 0 1px 3px hsl(0 0% 0% / 0.18);
  }

  .trail-picker__btn:focus-visible {
    outline: 2px solid var(--theme-accent-text, #7b1113);
    outline-offset: 1px;
  }

  .trail-closed {
    margin: 0;
    padding: 0.625rem 0.75rem;
    border: 1px solid var(--theme-border, hsl(0 0% 85%));
    border-left: 4px solid var(--theme-accent-text, #7b1113);
    border-radius: 0.5rem;
    color: var(--theme-text, hsl(0 0% 15%));
    font-size: 0.875rem;
    line-height: 1.45;
  }

  .trail-closed a,
  .trail-note a {
    color: inherit;
  }

  .trail-subtitle {
    margin: -0.25rem 0 0;
    color: var(--theme-text-2, hsl(0 0% 38%));
    font-size: 0.875rem;
  }

  .trail-facts {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.5rem 0.75rem;
    margin: 0.25rem 0;
  }

  .trail-facts--summary {
    grid-template-columns: repeat(auto-fit, minmax(5.5rem, 1fr));
  }

  .trail-facts div {
    min-width: 0;
  }

  .trail-facts dt {
    color: var(--theme-text-2, hsl(0 0% 38%));
    font-size: 0.75rem;
  }

  .trail-facts dd {
    margin: 0;
    color: var(--theme-text, hsl(0 0% 15%));
    font-size: 0.9375rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .trail-text {
    margin: 0;
    color: var(--theme-text, hsl(0 0% 15%));
    font-size: 0.9375rem;
    line-height: 1.45;
  }

  .trail-note,
  .trail-source {
    margin: 0;
    color: var(--theme-text-2, hsl(0 0% 38%));
    font-size: 0.8125rem;
    line-height: 1.4;
  }

  .trail-source {
    font-size: 0.75rem;
  }

  .trail-source a {
    color: inherit;
  }

  .trail-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .trail-section__title {
    margin: 0.25rem 0 0;
    color: var(--theme-accent-text, #7b1113);
    font-size: 0.875rem;
    font-weight: 500;
  }

  .trail-brief {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .trail-brief li {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    font-size: 0.875rem;
    line-height: 1.4;
    color: var(--theme-text, hsl(0 0% 15%));
  }

  .trail-brief strong {
    font-weight: 600;
  }

  .trail-stops {
    list-style: none;
    margin: 0 -0.5rem;
    padding: 0;
  }

  .trail-stop {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    min-height: 3.5rem;
    padding: 0.375rem 0.5rem;
    border: none;
    border-radius: 0.5rem;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }

  .trail-stop:hover,
  .trail-stop:focus-visible {
    background: var(--theme-accent-soft, hsl(5 20% 94%));
  }

  .trail-stop:focus-visible {
    outline: 2px solid var(--theme-accent-text, #7b1113);
    outline-offset: -2px;
  }

  .trail-stop__num {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 50%;
    background: var(--trail-color);
    color: #fff;
    font-size: 0.75rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .trail-stop__num--named {
    background: var(--theme-surface, #fff);
    color: var(--trail-color);
    box-shadow: inset 0 0 0 2px var(--trail-color);
  }

  .trail-stop__text {
    display: flex;
    flex: 1;
    min-width: 0;
    flex-direction: column;
  }

  .trail-stop__name {
    font-size: 1rem;
    color: var(--theme-text, hsl(0 0% 15%));
  }

  .trail-stop__meta {
    font-size: 0.8125rem;
    color: var(--theme-text-2, hsl(0 0% 38%));
    font-variant-numeric: tabular-nums;
  }

  .trail-stop :global(.trail-stop__chevron) {
    flex-shrink: 0;
    color: var(--theme-text-2, hsl(0 0% 38%));
  }

  .trail-stop-nav {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .trail-stop-nav__btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    min-height: 3rem;
    padding: 0.375rem 0.5rem;
    border: 1px solid var(--theme-border, hsl(0 0% 85%));
    border-radius: 0.75rem;
    background: none;
    color: var(--theme-text, hsl(0 0% 15%));
    font: inherit;
    font-size: 0.875rem;
    text-align: left;
    cursor: pointer;
  }

  .trail-stop-nav__btn--next {
    grid-column: 2;
    justify-content: flex-end;
    text-align: right;
  }

  .trail-stop-nav__btn:hover,
  .trail-stop-nav__btn:focus-visible {
    background: var(--theme-accent-soft, hsl(5 20% 94%));
  }

  .trail-stop-nav__text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .trail-stop-nav__hint {
    font-size: 0.75rem;
    color: var(--theme-text-2, hsl(0 0% 38%));
  }
</style>
