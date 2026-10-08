/**
 * Transient map overlays (Google Maps model): a route line, a filter or a tool
 * layer that something drew on the map for one task. Each belongs to the panel
 * that created it, and leaving that panel clears it at the source. When one is
 * still drawn without its panel (a route kept on the map, a tool covered by a
 * sheet, a filter set in Layers), the active-overlays chip bar lists it with an
 * X, and Back / Escape clears the most recent one first.
 *
 * Persistent preferences (map type, terrain, Makiling trail, camera HUD) are
 * not overlays and never register here.
 */

export type MapOverlayKind = "route" | "filter" | "tool";

export type MapOverlay = {
  id: string;
  kind: MapOverlayKind;
  /** Chip text, read reactively. */
  label: () => string;
  /** Drawn on (or changing) the map right now. */
  isActive: () => boolean;
  /** The panel that created it, and can remove it, is on screen. */
  ownerOpen: () => boolean;
  clear: () => void;
  /** Reopen the owning panel (tapping the chip label). */
  reopen?: () => void;
};

export class MapOverlayRegistry {
  // Raw: entries are plain objects of getters, compared by identity.
  private overlays = $state.raw<MapOverlay[]>([]);
  /**
   * Ids in the order they became active, oldest first. Plain (not state):
   * maintained when `active` is read, which the chip bar and Back tracking do
   * on every change, so it never feeds back into reactivity.
   */
  private order: string[] = [];

  /** Add (or replace by id) an overlay. Returns its unregister function. */
  register = (overlay: MapOverlay) => {
    this.overlays = [
      ...this.overlays.filter((entry) => entry.id !== overlay.id),
      overlay,
    ];
    return () => {
      this.overlays = this.overlays.filter((entry) => entry !== overlay);
    };
  };

  /** Active overlays, oldest first. */
  get active(): MapOverlay[] {
    const active = this.overlays.filter((overlay) => overlay.isActive());
    const ids = new Set(active.map((overlay) => overlay.id));
    this.order = this.order.filter((id) => ids.has(id));
    for (const overlay of active) {
      if (!this.order.includes(overlay.id)) this.order.push(overlay.id);
    }
    return active.sort(
      (a, b) => this.order.indexOf(a.id) - this.order.indexOf(b.id),
    );
  }

  /** Active overlays whose owning panel is closed: the chip bar's list. */
  get stranded(): MapOverlay[] {
    return this.active.filter((overlay) => !overlay.ownerOpen());
  }

  clear = (id: string) => {
    this.overlays.find((overlay) => overlay.id === id)?.clear();
  };

  /** Clear the overlay that became active last. False when none is active. */
  clearMostRecent = (): boolean => {
    const latest = this.active.at(-1);
    if (!latest) return false;
    latest.clear();
    return true;
  };

  clearAll = () => {
    for (const overlay of this.active) overlay.clear();
  };

  resetForTests = () => {
    this.overlays = [];
    this.order = [];
  };
}

export const mapOverlays = new MapOverlayRegistry();
