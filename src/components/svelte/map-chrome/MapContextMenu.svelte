<script lang="ts">
  import type * as mapGl from "maplibre-gl";
  import { onMount } from "svelte";
  import { trapFocus } from "@lib/focus-trap";
  import { portal } from "@lib/portal";
  import {
    registerEphemeralOverlayDismisser,
    openEphemeralOverlay,
  } from "@lib/overlay-stack";
  import CornerRightUp from "@lucide/svelte/icons/corner-right-up";
  import Crosshair from "@lucide/svelte/icons/crosshair";
  import Printer from "@lucide/svelte/icons/printer";
  import {
    directionsStore,
    locationStore,
    mapStore,
    mapViewStore,
    queryStore,
    sidePanelStore,
  } from "@lib/store.svelte";
  import { droppedPinStore } from "@lib/dropped-pin.svelte";
  import { getTransitMapPath } from "@lib/route-links";
  import DroppedPinPanel from "@ui/controls/DroppedPinPanel.svelte";
  import "./map-chrome.css";

  type MenuState = { x: number; y: number; lat: number; lng: number };

  /** Hold this long without moving to drop a pin on a touch screen. */
  const LONG_PRESS_MS = 500;
  const LONG_PRESS_SLOP_PX = 10;

  let menu = $state<MenuState | null>(null);
  let ignoreClicksUntil = 0;
  let panelEl = $state<HTMLDivElement | null>(null);

  onMount(() => registerEphemeralOverlayDismisser(() => (menu = null)));

  /** A press on a pin, route stop or other marker is not "empty map". */
  function onMarker(target: EventTarget | null): boolean {
    return (
      target instanceof Element && target.closest(".maplibregl-marker") !== null
    );
  }

  /**
   * Long-press or right-click on empty map, Google Maps style: drop a pin and
   * open the Dropped pin sheet. While planning directions the spot is more
   * likely a start or end, so the small from/to menu (#964) opens instead.
   */
  function pressAt(state: MenuState) {
    if (directionsStore.active) {
      openEphemeralOverlay(() => {
        menu = state;
      });
      return;
    }
    openEphemeralOverlay(() => {
      droppedPinStore.drop(state.lat, state.lng);
      // The pin replaces whatever was open, the search bar included.
      queryStore.clearQuery();
      sidePanelStore.openPanel({
        type: "search-result",
        component: DroppedPinPanel,
      });
      sidePanelStore.expand();
    });
  }

  // Registered here rather than in Map.svelte so the whole feature stays in
  // one component (the same shape MapControlsStack uses to subscribe to
  // camera events).
  $effect(() => {
    const map = mapStore.mapInstance;
    if (!map) return;
    const handleContextMenu = (event: mapGl.MapMouseEvent) => {
      // MapLibre suppresses the native menu once a listener exists; keep the
      // explicit call so a future listener reshuffle cannot regress it.
      event.originalEvent.preventDefault();
      if (onMarker(event.originalEvent.target)) return;
      pressAt({
        x: event.originalEvent.clientX,
        y: event.originalEvent.clientY,
        lat: event.lngLat.lat,
        lng: event.lngLat.lng,
      });
    };
    // iOS Safari never fires contextmenu, so a held finger opens the same
    // menu. Android fires both; the second open just replaces the first.
    let pressTimer: ReturnType<typeof setTimeout> | null = null;
    let pressStart: { x: number; y: number } | null = null;
    const cancelPress = () => {
      if (pressTimer) clearTimeout(pressTimer);
      pressTimer = null;
      pressStart = null;
    };
    const handleTouchStart = (event: mapGl.MapTouchEvent) => {
      cancelPress();
      const touch = event.originalEvent.touches[0];
      if (event.originalEvent.touches.length !== 1 || !touch) return;
      if (onMarker(event.originalEvent.target)) return;
      const { lngLat } = event;
      pressStart = { x: touch.clientX, y: touch.clientY };
      pressTimer = setTimeout(() => {
        const at = pressStart;
        cancelPress();
        if (!at) return;
        // The finger lifts over the menu it just opened; some browsers turn
        // that lift into a click on whichever item sits under it.
        ignoreClicksUntil = Date.now() + 450;
        navigator.vibrate?.(10);
        pressAt({ ...at, lat: lngLat.lat, lng: lngLat.lng });
      }, LONG_PRESS_MS);
    };
    const handleTouchMove = (event: mapGl.MapTouchEvent) => {
      const touch = event.originalEvent.touches[0];
      if (!pressStart || !touch) return;
      if (
        Math.hypot(touch.clientX - pressStart.x, touch.clientY - pressStart.y) >
        LONG_PRESS_SLOP_PX
      ) {
        cancelPress();
      }
    };

    map.on("contextmenu", handleContextMenu);
    map.on("touchstart", handleTouchStart);
    map.on("touchmove", handleTouchMove);
    map.on("touchend", cancelPress);
    map.on("touchcancel", cancelPress);
    map.on("movestart", cancelPress);
    return () => {
      cancelPress();
      map.off("contextmenu", handleContextMenu);
      map.off("touchstart", handleTouchStart);
      map.off("touchmove", handleTouchMove);
      map.off("touchend", cancelPress);
      map.off("touchcancel", cancelPress);
      map.off("movestart", cancelPress);
    };
  });

  function pinAt(state: MenuState) {
    return {
      lat: state.lat,
      lng: state.lng,
      label: "Dropped pin",
      dropped: true,
    };
  }

  function directionsFromHere() {
    if (!menu) return;
    const pin = pinAt(menu);
    close();
    if (directionsStore.active) void directionsStore.setOrigin(pin);
    else directionsStore.openFrom(pin);
  }

  function directionsToHere() {
    if (!menu) return;
    const pin = pinAt(menu);
    close();
    if (directionsStore.active) {
      void directionsStore.setDestination(pin);
      return;
    }
    // Same start as the Directions chip on a place: the rider's GPS fix.
    locationStore.requestLocation();
    const coords = locationStore.coords;
    void directionsStore.open(
      pin,
      coords ? { lat: coords[1], lng: coords[0], label: "Your location" } : null,
    );
  }

  // Clamp to the viewport once the panel has a size; right-clicks near the
  // bottom/right edge would otherwise push the menu off-screen.
  const clamped = $derived.by(() => {
    const state = menu;
    if (!state) return null;
    const width = panelEl?.offsetWidth ?? 0;
    const height = panelEl?.offsetHeight ?? 0;
    if (typeof window === "undefined") return { left: state.x, top: state.y };
    return {
      left: Math.max(8, Math.min(state.x, window.innerWidth - width - 8)),
      top: Math.max(8, Math.min(state.y, window.innerHeight - height - 8)),
    };
  });

  function close() {
    menu = null;
  }

  $effect(() => {
    if (!menu || !panelEl) return;
    return trapFocus(panelEl, { onEscape: close });
  });

  function handleDocumentPointerDown(event: PointerEvent) {
    if (!menu) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (panelEl?.contains(target)) return;
    close();
  }
</script>

<svelte:window onpointerdown={handleDocumentPointerDown} />

{#if menu && clamped}
  <div
    bind:this={panelEl}
    class="map-context-menu map-chrome-popover"
    style={`left: ${clamped.left}px; top: ${clamped.top}px;`}
    role="dialog"
    aria-label="Map options"
    use:portal
    onclickcapture={(event) => {
      if (Date.now() < ignoreClicksUntil) {
        event.preventDefault();
        event.stopPropagation();
      }
    }}
  >
    <button
      type="button"
      class="map-context-menu__item"
      onclick={directionsFromHere}
    >
      <Crosshair size={15} aria-hidden="true" />
      Directions from here
    </button>
    <button
      type="button"
      class="map-context-menu__item"
      onclick={directionsToHere}
    >
      <CornerRightUp size={15} aria-hidden="true" />
      Directions to here
    </button>
    <a
      class="map-context-menu__item"
      href={getTransitMapPath({ lat: menu.lat, lon: menu.lng })}
      target="_blank"
      rel="noreferrer"
      onclick={close}
    >
      <Printer size={15} aria-hidden="true" />
      Printable jeep map from here
    </a>
    <label class="map-context-menu__toggle">
      <input
        type="checkbox"
        checked={mapViewStore.cameraDebug}
        onchange={mapViewStore.toggleCameraDebug}
      />
      Show camera details
    </label>
    <p class="map-chrome-popover-footnote">
      {menu.lat.toFixed(5)}, {menu.lng.toFixed(5)}
    </p>
  </div>
{/if}

<style>
  .map-context-menu {
    position: fixed;
    z-index: var(--z-chrome-popover, 17);
    width: min(15rem, calc(100vw - 1rem));
    padding: 0.375rem;
  }

  .map-context-menu__item,
  .map-context-menu__toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.375rem;
    border-radius: 0.5rem;
    font-size: 0.8125rem;
    font-weight: 600;
    color: hsl(0, 0%, 13%);
    cursor: pointer;
  }

  .map-context-menu__item {
    width: 100%;
    border: none;
    background: none;
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    text-align: left;
    text-decoration: none;
  }

  .map-context-menu__item:focus-visible,
  .map-context-menu__item:hover,
  .map-context-menu__toggle:hover {
    background-color: hsl(5, 20%, 95%);
  }

  .map-context-menu__toggle input {
    accent-color: hsl(5, 53%, 32%);
    width: 0.9375rem;
    height: 0.9375rem;
  }
</style>
