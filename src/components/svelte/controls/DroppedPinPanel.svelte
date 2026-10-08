<script lang="ts">
  import { onDestroy, tick } from "svelte";
  import Copy from "@lucide/svelte/icons/copy";
  import CornerRightUp from "@lucide/svelte/icons/corner-right-up";
  import Crosshair from "@lucide/svelte/icons/crosshair";
  import MapPinPlus from "@lucide/svelte/icons/map-pin-plus";
  import Printer from "@lucide/svelte/icons/printer";
  import MapChromeActionChip from "@ui/map-chrome/MapChromeActionChip.svelte";
  import EntityPanelClose from "./EntityPanelClose.svelte";
  import { copyTextToClipboard } from "@lib/clipboard";
  import { droppedPinStore, formatPinCoords } from "@lib/dropped-pin.svelte";
  import { getTransitMapPath } from "@lib/route-links";
  import {
    additionProposalStore,
    directionsStore,
    editorChromeStore,
    locationStore,
    sidePanelStore,
    toastStore,
  } from "@lib/store.svelte";

  /**
   * Google Maps' "Dropped pin" sheet: what a long-press or right-click on
   * empty map opens. Coordinates, then what you can do with the spot.
   */

  const at = $derived(droppedPinStore.at);
  const coords = $derived(at ? formatPinCoords(at) : "");

  // The pin belongs to this sheet: closing or replacing the sheet lifts it.
  onDestroy(() => droppedPinStore.clear());

  function pin() {
    if (!at) return null;
    return { lat: at.lat, lng: at.lng, label: "Dropped pin", dropped: true };
  }

  function directionsToHere() {
    const target = pin();
    if (!target) return;
    // Directions takes over the sheet; this one (and its pin) step aside.
    sidePanelStore.closePanel();
    // Same start as the Directions chip on a place: the rider's GPS fix.
    locationStore.requestLocation();
    const gps = locationStore.coords;
    void directionsStore.open(
      target,
      gps ? { lat: gps[1], lng: gps[0], label: "Your location" } : null,
    );
  }

  function directionsFromHere() {
    const target = pin();
    if (!target) return;
    sidePanelStore.closePanel();
    directionsStore.openFrom(target);
  }

  async function copyCoordinates() {
    try {
      await copyTextToClipboard(coords);
      toastStore.show(`Copied ${coords}.`, "success");
    } catch {
      toastStore.show("Could not copy the coordinates.", "error");
    }
  }

  async function addMissingPlace() {
    if (!at) return;
    const spot = { lat: at.lat, lon: at.lng };
    editorChromeStore.openAdditionModal();
    // After the form mounts: it restores any saved draft (and its pin) on
    // mount, and this spot is the one the user just pointed at.
    await tick();
    additionProposalStore.setDraftPin(spot);
  }

  function close() {
    sidePanelStore.closePanel();
  }
</script>

{#if at}
  <div class="entity-detail dropped-pin">
    <header class="entity-header">
      <div class="dropped-pin__title-row">
        <h2 class="entity-header__title">Dropped pin</h2>
        <EntityPanelClose ariaLabel="Close dropped pin" onclick={close} />
      </div>
      <p class="dropped-pin__coords">{coords}</p>
      <div class="entity-actions">
        <MapChromeActionChip toolbar onclick={directionsToHere}>
          <CornerRightUp size={14} aria-hidden="true" />
          Directions to here
        </MapChromeActionChip>
        <MapChromeActionChip toolbar onclick={copyCoordinates}>
          <Copy size={14} aria-hidden="true" />
          Copy coordinates
        </MapChromeActionChip>
        <MapChromeActionChip toolbar onclick={addMissingPlace}>
          <MapPinPlus size={14} aria-hidden="true" />
          Add a missing place here
        </MapChromeActionChip>
        <MapChromeActionChip toolbar onclick={directionsFromHere}>
          <Crosshair size={14} aria-hidden="true" />
          Directions from here
        </MapChromeActionChip>
        <a
          class="map-chrome-action-chip map-chrome-action-chip--toolbar dropped-pin__link"
          href={getTransitMapPath({ lat: at.lat, lon: at.lng })}
          target="_blank"
          rel="noreferrer"
        >
          <Printer size={14} aria-hidden="true" />
          Printable jeep map
        </a>
      </div>
    </header>
  </div>
{/if}

<style>
  @import "./entity-detail.css";

  .dropped-pin__title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .dropped-pin__coords {
    margin: 0.125rem 0 0.5rem;
    color: var(--theme-text-2, hsl(0, 0%, 32%));
    font-size: 0.875rem;
    font-variant-numeric: tabular-nums;
  }

  .dropped-pin__link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    text-decoration: none;
  }
</style>
