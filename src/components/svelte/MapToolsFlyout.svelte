<script lang="ts">
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import Box from "@lucide/svelte/icons/box";
  import Bus from "@lucide/svelte/icons/bus";
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import Gauge from "@lucide/svelte/icons/gauge";
  import GraduationCap from "@lucide/svelte/icons/graduation-cap";
  import Landmark from "@lucide/svelte/icons/landmark";
  import Route from "@lucide/svelte/icons/route";
  import Ruler from "@lucide/svelte/icons/ruler";
  import Timer from "@lucide/svelte/icons/timer";
  import Users from "@lucide/svelte/icons/users";
  import X from "@lucide/svelte/icons/x";
  // One Layers button, Google Maps style: map type on top, then the map
  // details, pins and tools as Material settings rows. It replaced separate
  // 3D, satellite and wrench buttons on the right edge.
  import Layers from "@lucide/svelte/icons/layers";
  import { onMount } from "svelte";
  import {
    jeepneyStore,
    mapStore,
    mapToolsStore,
    mapViewStore,
    measureRouteStore,
    plannerStore,
    terrainStore,
    toastStore,
    travelTimeStore,
  } from "@lib/store.svelte";
  import { sidebarStore } from "@lib/store.svelte";
  import { routableTodayWeekday, routeToday } from "@lib/today-route";
  import { THREE_D_PITCH, isMap2DPitch } from "@constants/map-dimension";
  import {
    enterFlatMapDimension,
    enterTiltedMapDimension,
  } from "@lib/map-dimension-layers";
  import { debugMode } from "@lib/debug-flag";
  import { trackOverlay } from "@lib/track-overlay.svelte";
  import WaybackImageryControl from "@ui/WaybackImageryControl.svelte";
  import MapLegend from "@ui/MapLegend.svelte";
  import TerrainControl from "@ui/TerrainControl.svelte";
  import { TERRAIN_ENABLED } from "@constants/map-terrain";
  import TrailControl from "@ui/TrailControl.svelte";
  import ScheduleImportPanel from "@ui/ScheduleImportPanel.svelte";
  import MapChromeFabTrigger from "@ui/map-chrome/MapChromeFabTrigger.svelte";
  import MapTypePicker from "@ui/map-chrome/MapTypePicker.svelte";
  import Dialog from "@ui/modal/Dialog.svelte";
  import SegmentedControl from "@ui/modal/SegmentedControl.svelte";
  import SettingsRow from "@ui/modal/SettingsRow.svelte";
  import { portal } from "@lib/portal";
  import { campusTransit } from "../../campus.config";
  import "./map-chrome/map-chrome.css";

  /** Root list, or a sub-screen pushed inside the same sheet. */
  let screen = $state<"root" | "schedule">("root");
  let scrolled = $state(false);
  let bodyEl = $state<HTMLDivElement | null>(null);

  function closeSheet() {
    mapToolsStore.close();
  }

  // Each closed sheet starts again from its root list.
  $effect(() => {
    if (!mapToolsStore.open) {
      screen = "root";
      scrolled = false;
    }
  });

  // Back closes the topmost layer first: the sub-screen, then the sheet.
  trackOverlay("layers", () => mapToolsStore.open, closeSheet);
  trackOverlay(
    "layers-schedule",
    () => mapToolsStore.open && screen === "schedule",
    () => (screen = "root"),
  );

  function openScreen(next: "schedule") {
    screen = next;
    scrolled = false;
    bodyEl?.scrollTo({ top: 0 });
  }

  function popOrClose() {
    if (screen !== "root") screen = "root";
    else closeSheet();
  }

  // 3D is a camera tilt, independent of the map type underneath.
  let pitch = $state(0);
  const tilted = $derived(!isMap2DPitch(pitch));

  $effect(() => {
    const map = mapStore.mapInstance;
    if (!map) return;
    const sync = () => (pitch = map.getPitch());
    sync();
    map.on("pitch", sync);
    return () => map.off("pitch", sync);
  });

  function toggle3D() {
    const map = mapStore.mapInstance;
    if (!map) return;
    if (isMap2DPitch(map.getPitch())) {
      map.easeTo({ pitch: THREE_D_PITCH, duration: 400 });
      map.once("moveend", () =>
        enterTiltedMapDimension(map, terrainStore.enabled),
      );
      return;
    }
    enterFlatMapDimension(map, terrainStore.enabled);
    // Pitch only: snapping north here would throw away a rotation the user
    // set on purpose. The compass is the control that resets rotation.
    map.easeTo({ pitch: 0, duration: 400 });
  }

  // Saved plans decide whether "My classes" has anything to highlight.
  onMount(() => plannerStore.init());
  const hasPlannerClasses = $derived(
    (plannerStore.activePlan?.sections.length ?? 0) > 0,
  );

  function poiSupporting(on: boolean): string | undefined {
    // Org/place pins also answer to a zoom gate, so "on" alone would lie
    // while the user is zoomed out past it.
    return on && !mapViewStore.poiPinsZoomVisible
      ? "Shown when you zoom in"
      : undefined;
  }

  const pinOptions = [
    { value: "all", label: "All" },
    { value: "events", label: "Events only" },
  ] as const;

  function setPins(value: "all" | "events") {
    if ((value === "events") !== mapViewStore.eventsOnly) {
      mapViewStore.toggleEventsOnly();
    }
  }

  function toggleTravelTime() {
    travelTimeStore.toggle();
    // Hand the map back so the user can tap an origin right away.
    if (travelTimeStore.active) closeSheet();
  }

  function toggleMeasureRoute() {
    // Walking time beside measuring is fine once its start point is set. One
    // still waiting for that tap would swallow the first waypoint, so that is
    // the one case that turns it off.
    const pickingStart = travelTimeStore.active && !travelTimeStore.origin;
    measureRouteStore.toggle();
    if (!measureRouteStore.active) return;
    if (pickingStart) {
      travelTimeStore.disable();
      toastStore.show("Walking time turned off while measuring");
    }
    closeSheet();
  }

  // Day route lived on its own status-bar chip before the chrome redesign;
  // the redesign dropped that mount, so the toolbox is its home now. Hidden
  // when there is nothing to route today, same as the old chip.
  const dayRoutable = $derived(routableTodayWeekday() !== null);
  let dayRouting = $state(false);

  async function handleRouteMyDay() {
    if (dayRouting) return;
    dayRouting = true;
    try {
      if (await routeToday()) {
        closeSheet();
        sidebarStore.changeOpened("map");
      }
    } finally {
      dayRouting = false;
    }
  }

  // Drag the handle down to dismiss the phone sheet, the way a Material
  // bottom sheet does; a short drag springs back.
  let dragStartY: number | null = null;
  let dragOffset = $state(0);

  function handleDragStart(event: PointerEvent) {
    dragStartY = event.clientY;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function handleDragMove(event: PointerEvent) {
    if (dragStartY === null) return;
    dragOffset = Math.max(0, event.clientY - dragStartY);
  }

  function handleDragEnd() {
    if (dragStartY === null) return;
    dragStartY = null;
    if (dragOffset > 96) closeSheet();
    dragOffset = 0;
  }

  const screenTitle = $derived(
    screen === "schedule" ? "Schedule route" : "Layers",
  );
</script>

<div class="map-tools-flyout">
  <MapChromeFabTrigger
    ariaExpanded={mapToolsStore.open}
    ariaControls="map-tools-panel"
    ariaLabel="Layers"
    onclick={() => mapToolsStore.toggle()}
  >
    <Layers size={18} aria-hidden="true" />
  </MapChromeFabTrigger>

  <!-- Portaled to the layout root: the trigger lives in the mobile controls
       stack, whose z-index (map tools, 15) would otherwise trap this dialog
       under the search bar and filter chips (18). -->
  <div class="map-tools-dialog-host" use:portal={".app-layout"}>
  <Dialog
    open={mapToolsStore.open}
    onclose={closeSheet}
    onescape={popOrClose}
    ariaLabel="Layers"
    showClose={false}
  >
    <div
      class="layers-sheet"
      id="map-tools-panel"
      style:translate={dragOffset ? `0 ${dragOffset}px` : undefined}
    >
      <div
        class="layers-sheet__handle"
        aria-hidden="true"
        onpointerdown={handleDragStart}
        onpointermove={handleDragMove}
        onpointerup={handleDragEnd}
        onpointercancel={handleDragEnd}
      >
        <span class="layers-sheet__handle-bar"></span>
      </div>
      <header class="layers-bar" class:layers-bar--scrolled={scrolled}>
        <button
          type="button"
          class="layers-bar__nav"
          aria-label={screen === "root" ? "Close layers" : "Back to layers"}
          onclick={screen === "root" ? closeSheet : () => (screen = "root")}
        >
          {#if screen === "root"}
            <X size={24} aria-hidden="true" />
          {:else}
            <ArrowLeft size={24} aria-hidden="true" />
          {/if}
        </button>
        <h2 class="layers-bar__title">{screenTitle}</h2>
      </header>

      <div
        bind:this={bodyEl}
        class="layers-sheet__body"
        onscroll={(event) =>
          (scrolled = (event.currentTarget as HTMLElement).scrollTop > 0)}
      >
        {#if screen === "root"}
          <section class="layers-section" aria-labelledby="layers-map-type">
            <h3 id="layers-map-type" class="layers-section__label">Map type</h3>
            <MapTypePicker labelledBy="layers-map-type" />
            <div class="layers-section__pad">
              <WaybackImageryControl />
            </div>
          </section>

          <section class="layers-section" aria-labelledby="layers-details">
            <h3 id="layers-details" class="layers-section__label">
              Map details
            </h3>
            <div class="layers-list">
              <SettingsRow
                label="3D"
                supporting="Tilt the map to show buildings in 3D"
                icon={Box}
                checked={tilted}
                onclick={toggle3D}
              />
              {#if TERRAIN_ENABLED}
                <TerrainControl variant="row" />
              {/if}
              <TrailControl />
              <SettingsRow
                label="Orgs, units and offices"
                supporting={poiSupporting(mapViewStore.showOrgs)}
                icon={Users}
                checked={mapViewStore.showOrgs}
                onclick={mapViewStore.toggleOrgs}
              />
              <SettingsRow
                label="Landmarks and establishments"
                supporting={poiSupporting(mapViewStore.showPlaces)}
                icon={Landmark}
                checked={mapViewStore.showPlaces}
                onclick={mapViewStore.togglePlaces}
              />
              {#if campusTransit.enabled}
                <SettingsRow
                  label="Jeepney routes"
                  icon={Bus}
                  checked={jeepneyStore.layerActive}
                  onclick={jeepneyStore.toggleLayer}
                />
              {/if}
              <SettingsRow
                label="My classes"
                supporting={hasPlannerClasses
                  ? "Highlight the buildings your classes are in"
                  : "Add classes in the Planner first"}
                icon={GraduationCap}
                checked={hasPlannerClasses && mapViewStore.highlightMyBuildings}
                disabled={!hasPlannerClasses}
                onclick={mapViewStore.toggleHighlightMyBuildings}
              />
            </div>
          </section>

          <section class="layers-section" aria-labelledby="layers-pins">
            <h3 id="layers-pins" class="layers-section__label">Pins</h3>
            <div class="layers-section__pad">
              <SegmentedControl
                options={pinOptions}
                value={mapViewStore.eventsOnly ? "events" : "all"}
                labelledBy="layers-pins"
                onchange={setPins}
              />
            </div>
          </section>

          <section class="layers-section" aria-labelledby="layers-tools">
            <h3 id="layers-tools" class="layers-section__label">Map tools</h3>
            <div class="layers-list">
              {#if dayRoutable}
                <SettingsRow
                  label="Route my day"
                  supporting={dayRouting
                    ? "Routing your classes now"
                    : "Walk route through today's classes"}
                  icon={Route}
                  busy={dayRouting}
                  onclick={handleRouteMyDay}
                />
              {/if}
              <SettingsRow
                label="Walking time"
                supporting={travelTimeStore.active
                  ? "Tap the map to pick a start point"
                  : "Color paths by walking minutes from a point"}
                icon={Timer}
                checked={travelTimeStore.active}
                onclick={toggleTravelTime}
              />
              <SettingsRow
                label="Measure route"
                supporting={measureRouteStore.active
                  ? "Tap the map or a pin to drop waypoints"
                  : "Drop waypoints for walk, cycle and car times"}
                icon={Ruler}
                checked={measureRouteStore.active}
                onclick={toggleMeasureRoute}
              />
              <SettingsRow
                chevron
                label="Schedule route"
                supporting="Route a weekday of your planned classes"
                icon={CalendarDays}
                onclick={() => openScreen("schedule")}
              />
            </div>
          </section>

          {#if debugMode}
            <section class="layers-section" aria-labelledby="layers-developer">
              <h3 id="layers-developer" class="layers-section__label">
                Developer
              </h3>
              <div class="layers-list">
                <SettingsRow
                  label="Camera details"
                  supporting="Live zoom, pitch, bearing and center readout"
                  icon={Gauge}
                  checked={mapViewStore.cameraDebug}
                  onclick={mapViewStore.toggleCameraDebug}
                />
              </div>
            </section>
          {/if}

          <section class="layers-section" aria-labelledby="layers-legend">
            <h3 id="layers-legend" class="layers-section__label">Legend</h3>
            <div class="layers-section__pad">
              <MapLegend embedded />
            </div>
          </section>
        {:else if screen === "schedule"}
          <div class="layers-section layers-section__pad">
            <ScheduleImportPanel embedded />
          </div>
        {/if}
      </div>
    </div>
  </Dialog>
  </div>
</div>

<style>
  /* Phone portrait (< 600px): a partial-height bottom sheet with a drag
     handle. Wider screens and phones on their side: a right side sheet,
     360 to 400px, so the map stays visible beside it (Google Maps layers). */
  .map-tools-dialog-host :global(.overlay) {
    background-color: hsla(0, 0%, 0%, 0.32);
  }

  .map-tools-dialog-host :global(.modal-set) {
    justify-content: flex-end;
    align-items: stretch;
    padding: 0;
  }

  .map-tools-dialog-host :global(.modal-content) {
    flex: 0 0 auto;
    width: min(25rem, calc(100vw - 3.5rem));
    height: 100dvh;
    max-height: 100dvh;
    padding: 0 env(safe-area-inset-right, 0px) 0 0;
    border-radius: 1rem 0 0 1rem;
  }

  @media (max-width: 37.4375rem) {
    .map-tools-dialog-host :global(.modal-set) {
      justify-content: center;
      align-items: flex-end;
    }

    .map-tools-dialog-host :global(.modal-content) {
      width: 100%;
      height: auto;
      max-height: 85dvh;
      border-radius: 1.75rem 1.75rem 0 0;
    }
  }

  .layers-sheet {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    min-width: 0;
    background: var(--theme-surface, #fff);
  }

  .layers-sheet__handle {
    display: none;
  }

  @media (max-width: 37.4375rem) {
    .layers-sheet__handle {
      display: flex;
      flex-shrink: 0;
      justify-content: center;
      align-items: center;
      height: 1.5rem;
      cursor: grab;
      touch-action: none;
    }
  }

  .layers-sheet__handle-bar {
    width: 2rem;
    height: 0.25rem;
    border-radius: 999px;
    background: var(--theme-border-strong, hsl(0, 0%, 60%));
  }

  .layers-bar {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 0.25rem;
    min-height: 3.5rem;
    padding: 0 1rem 0 0.25rem;
    border-bottom: 1px solid transparent;
  }

  .layers-bar--scrolled {
    border-bottom-color: var(--theme-border, hsl(0, 0%, 88%));
  }

  .layers-bar__nav {
    all: unset;
    box-sizing: border-box;
    display: grid;
    place-items: center;
    flex: 0 0 3rem;
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    color: var(--theme-text, hsl(0, 0%, 12%));
    cursor: pointer;
  }

  .layers-bar__nav:hover {
    background-color: var(--theme-accent-soft, hsl(5, 30%, 95%));
  }

  .layers-bar__nav:focus-visible {
    outline: 2px solid var(--theme-accent-text, hsl(5, 53%, 32%));
    outline-offset: -2px;
  }

  .layers-bar__title {
    flex: 1 1 auto;
    min-width: 0;
    margin: 0;
    overflow: hidden;
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1.75rem;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--theme-text, hsl(0, 0%, 12%));
  }

  .layers-sheet__body {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1 1 auto;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
  }

  .layers-section {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .layers-section__label {
    margin: 0;
    padding: 1rem 1rem 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.25rem;
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
  }

  .layers-section__pad {
    min-width: 0;
    padding: 0 1rem;
  }

  .layers-section__pad:empty {
    display: none;
  }

  .layers-list {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .map-tools-flyout {
    position: relative;
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
    overflow: visible;
  }

  /* #716: was @media (min-width: 48.0625rem), now gated by .desktop class */
  :global(.desktop) .map-tools-flyout {
    z-index: 1;
  }
</style>
