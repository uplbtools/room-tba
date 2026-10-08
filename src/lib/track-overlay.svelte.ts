import { untrack } from "svelte";
import {
  closeOverlay,
  openOverlay,
  type OverlayOptions,
} from "./overlay-history";

/**
 * Give an overlay its own history entry while `isOpen()` is true: Back calls
 * `close`, and closing it any other way takes the entry back off. Call from a
 * component's script (or an `$effect.root`); it tears down with it.
 */
export function trackOverlay(
  key: string,
  isOpen: () => boolean,
  close: () => void,
  options: () => OverlayOptions = () => ({}),
) {
  let id: number | null = null;

  $effect(() => {
    const open = isOpen();
    untrack(() => {
      if (open && id === null) {
        id = openOverlay(
          key,
          () => {
            id = null;
            close();
          },
          options(),
        );
      } else if (!open && id !== null) {
        const closing = id;
        id = null;
        closeOverlay(closing);
      }
    });
  });

  $effect(() => () => {
    if (id === null) return;
    const closing = id;
    id = null;
    closeOverlay(closing);
  });
}
