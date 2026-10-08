<script lang="ts">
  /**
   * URL-borne map state and Back for store-driven overlays (Jakob audit
   * macros 1 and 2). Formats live in lib/app-url-state; history bookkeeping in
   * lib/overlay-history. Entity paths stay with EntityUrlSync.
   */
  import { onMount } from "svelte";
  import { debounce } from "es-toolkit";
  import { getAppData } from "@lib/context";
  import { openBrowseClasses, openCampusBrowse } from "@lib/browse-campus";
  import { isScreenId } from "@lib/entity-url-sync";
  import {
    formatDirectionsParam,
    formatMapHash,
    parseMapHash,
    readAppState,
    withAppState,
    withHash,
    type DirectionsToken,
  } from "@lib/app-url-state";
  import { replaceAppUrl } from "@lib/overlay-history";
  import { trackOverlay } from "@lib/track-overlay.svelte";
  import { droppedPinStore } from "@lib/dropped-pin.svelte";
  import { slugifySegment } from "@lib/site";
  import {
    YOUR_LOCATION_LABEL,
    type DirectionsEndpoint,
  } from "@lib/stores/directions-store.svelte";
  import {
    adminAuthStore,
    appBootstrapStore,
    building3DStore,
    directionsStore,
    editorChromeStore,
    jeepneyStore,
    locationStore,
    mapStore,
    mapToolsStore,
    modalStore,
    queryStore,
    sidePanelStore,
    sidebarStore,
  } from "@lib/store.svelte";

  const appData = getAppData();

  // ── Back closes these before anything else ─────────────────────────────
  trackOverlay("modal", () => modalStore.open, modalStore.closeModal);
  trackOverlay(
    "building-3d",
    () => building3DStore.buildingName !== null,
    building3DStore.close,
  );
  trackOverlay("sign-in", () => adminAuthStore.loginOpen, adminAuthStore.closeLogin);
  trackOverlay(
    "account-settings",
    () => adminAuthStore.accountSettingsOpen,
    adminAuthStore.closeAccountSettings,
  );
  trackOverlay(
    "manage-users",
    () => adminAuthStore.manageUsersOpen,
    adminAuthStore.closeManageUsers,
  );
  trackOverlay(
    "add-to-map",
    () => editorChromeStore.additionModalOpen,
    editorChromeStore.closeAdditionModal,
  );
  trackOverlay("map-tools", () => mapToolsStore.open, mapToolsStore.close);
  trackOverlay("menu-rail", () => sidebarStore.railOpen, sidebarStore.closeRail);
  // Long-press "Dropped pin" sheet; the panel lifts its pin when it closes.
  trackOverlay(
    "dropped-pin",
    () => droppedPinStore.at !== null,
    sidePanelStore.closePanel,
  );

  // ── Directions: /…?dir=<from>/<to> ─────────────────────────────────────
  type Named = { name: string; lat: number | null; lon: number | null };

  function campusPoints(): Named[] {
    const data = appData();
    return [
      ...(data.buildings ?? []).map((b) => ({
        name: b.buildingName,
        lat: b.lat,
        lon: b.lon,
      })),
      ...(data.dorms ?? []).map((d) => ({
        name: d.dormName,
        lat: d.lat,
        lon: d.lon,
      })),
      ...(data.places ?? []).map((p) => ({
        name: p.name,
        lat: p.lat,
        lon: p.lon,
      })),
    ];
  }

  /** A named campus place reads better (and survives pin moves) as a slug. */
  function tokenFor(endpoint: DirectionsEndpoint): DirectionsToken {
    const slug = slugifySegment(endpoint.label);
    const match = slug
      ? campusPoints().find(
          (point) =>
            point.lat !== null &&
            point.lon !== null &&
            slugifySegment(point.name) === slug &&
            Math.abs(point.lat - endpoint.lat) < 0.0005 &&
            Math.abs(point.lon - endpoint.lng) < 0.0005,
        )
      : undefined;
    return match
      ? { kind: "slug", slug }
      : { kind: "coords", lat: endpoint.lat, lng: endpoint.lng };
  }

  function resolveToken(token: DirectionsToken): DirectionsEndpoint | null {
    if (token.kind === "me") return null;
    if (token.kind === "coords") {
      return { lat: token.lat, lng: token.lng, label: "Dropped pin", dropped: true };
    }
    const point = campusPoints().find(
      (entry) =>
        entry.lat !== null &&
        entry.lon !== null &&
        slugifySegment(entry.name) === token.slug,
    );
    return point && point.lat !== null && point.lon !== null
      ? { lat: point.lat, lng: point.lon, label: point.name }
      : null;
  }

  const directionsParam = $derived.by(() => {
    if (!directionsStore.active || !directionsStore.destination) return null;
    const origin = directionsStore.origin;
    // A swapped GPS start is pinned at the fix but still means "me" to
    // whoever opens the link.
    const fromGps =
      !origin ||
      !directionsStore.originFixed ||
      origin.label === YOUR_LOCATION_LABEL;
    return formatDirectionsParam({
      from: fromGps ? { kind: "me" } : tokenFor(origin),
      to: tokenFor(directionsStore.destination),
      via: directionsStore.waypoints.map(tokenFor),
    });
  });

  // The mode tab rides along only when it is not the default (the fastest
  // option's mode), so most links stay as short as from/to.
  const directionsMode = $derived.by(() => {
    if (!directionsParam) return null;
    const mode = directionsStore.mode;
    return mode && mode !== directionsStore.journeys[0]?.kind ? mode : null;
  });

  trackOverlay(
    "directions",
    () => directionsStore.active,
    directionsStore.close,
    () => ({
      url: (url) =>
        withAppState(url, { dir: directionsParam, mode: directionsMode }),
    }),
  );
  trackOverlay(
    "navigation",
    () => directionsStore.navigating,
    directionsStore.stopNavigation,
  );

  // Declared after the directions overlay so its entry exists before the
  // URL is rewritten (effects run in order); the page under it stays bare.
  $effect(() => {
    const dir = directionsParam;
    const mode = directionsMode;
    if (!directionsStore.active) return;
    replaceAppUrl((url) => withAppState(url, { dir, mode }));
  });

  // ── Camera: #map=zoom/lat/lng ──────────────────────────────────────────
  const initial =
    typeof window !== "undefined"
      ? {
          camera: parseMapHash(window.location.hash),
          state: readAppState(window.location.search),
        }
      : null;
  let cameraRestored = false;

  $effect(() => {
    const map = mapStore.mapInstance;
    if (!map) return;

    const camera = initial?.camera;
    if (camera && !cameraRestored) {
      cameraRestored = true;
      const apply = () =>
        map.jumpTo({ center: [camera.lng, camera.lat], zoom: camera.zoom });
      if (map.loaded()) apply();
      else map.once("load", apply);
    }

    const writeCamera = debounce(() => {
      // Full screens (/planner, /today) own their URL; the map is hidden.
      if (isScreenId(sidebarStore.panelOpen)) return;
      const center = map.getCenter();
      const hash = formatMapHash({
        zoom: map.getZoom(),
        lat: center.lat,
        lng: center.lng,
      });
      replaceAppUrl((url) => withHash(url, hash));
    }, 400);
    map.on("moveend", writeCamera);
    return () => {
      map.off("moveend", writeCamera);
      writeCamera.cancel();
    };
  });

  // ── Fresh loads: /?browse=, /?q=, /?dir= ───────────────────────────────
  let pendingDirections = initial?.state.dir ?? null;

  async function restoreDirections() {
    const dir = pendingDirections;
    if (!dir) return;
    pendingDirections = null;
    const destination = resolveToken(dir.to);
    const origin = resolveToken(dir.from);
    const waypoints = (dir.via ?? []).map(resolveToken);
    if (!destination || (dir.from.kind !== "me" && !origin)) return;
    if (waypoints.some((stop) => stop === null)) return;
    if (!origin) locationStore.requestLocation();
    const gpsOrigin =
      !origin && locationStore.coords
        ? {
            lat: locationStore.coords[1],
            lng: locationStore.coords[0],
            label: YOUR_LOCATION_LABEL,
          }
        : null;
    await directionsStore.restore({
      origin: origin ?? gpsOrigin,
      originFixed: origin !== null,
      destination,
      waypoints: waypoints as DirectionsEndpoint[],
      mode: initial?.state.mode ?? null,
      navigating: false,
    });
  }

  onMount(() => {
    const state = initial?.state;
    if (!state) return;

    // The directions overlay pushes its own entry carrying ?dir=; the entry
    // it opens over is the plain page, so Back lands somewhere sensible.
    // (Search restores ?q= itself; it owns the draft text.)
    if (state.dir) {
      replaceAppUrl((url) => withAppState(url, { dir: null, mode: null }));
    }

    if (state.browse === "events") {
      queryStore.updateQuery({
        category: "events",
        type: "result",
        value: "Campus events",
      });
      queryStore.inputValue = "";
      sidePanelStore.expand();
    } else if (state.browse === "classes") {
      openBrowseClasses(queryStore, sidePanelStore);
    } else if (state.browse) {
      if (state.browse === "jeepney") jeepneyStore.enableLayer();
      openCampusBrowse(queryStore, sidePanelStore, state.browse);
    }
  });

  // Slugs need campus data; coordinates and "me" could go now, but one path
  // keeps the order simple.
  $effect(() => {
    if (pendingDirections && appBootstrapStore.phase === "ready") {
      void restoreDirections();
    }
  });
</script>
