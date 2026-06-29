/** Ephemeral chrome (flyouts, chip panels) dismissed when blocking UI opens (#302). */

import { entityHoverPreviewStore } from "./entity-hover-preview.svelte";

const dismissers = new Set<() => void>();

export function registerEphemeralOverlayDismisser(dismiss: () => void) {
  dismissers.add(dismiss);
  return () => {
    dismissers.delete(dismiss);
  };
}

export function dismissEphemeralOverlays() {
  entityHoverPreviewStore.hideNow();
  for (const dismiss of dismissers) {
    dismiss();
  }
}
