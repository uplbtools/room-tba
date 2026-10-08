/**
 * The pin a long-press or right-click drops on empty map (Google Maps'
 * "Dropped pin"). Map.svelte draws it; DroppedPinPanel describes it; the
 * panel clears it when the sheet closes or is replaced.
 */
class DroppedPinStore {
  at: { lat: number; lng: number } | null = $state(null);

  drop = (lat: number, lng: number) => {
    this.at = { lat, lng };
  };

  clear = () => {
    this.at = null;
  };
}

export const droppedPinStore = new DroppedPinStore();

/** "14.16512, 121.24138": the lat, lng order people paste into other maps. */
export function formatPinCoords(at: { lat: number; lng: number }): string {
  return `${at.lat.toFixed(5)}, ${at.lng.toFixed(5)}`;
}
