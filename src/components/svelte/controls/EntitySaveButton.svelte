<script lang="ts">
  import Star from "@lucide/svelte/icons/star";
  import { untrack } from "svelte";
  import MapChromeActionChip from "@ui/map-chrome/MapChromeActionChip.svelte";
  import { toastStore } from "@lib/store.svelte";
  import {
    recentPlaces,
    savedPlaces,
    type SavedPlaceInput,
  } from "@lib/saved-places.svelte";

  type Props = {
    place: SavedPlaceInput;
  };

  let { place }: Props = $props();

  const saved = $derived(savedPlaces.has(place.category, place.value));

  // Every saveable sheet renders this button once its entity has loaded, so
  // it doubles as the "Recently viewed" hook instead of four more effects.
  $effect(() => {
    const viewed = { ...place };
    untrack(() => recentPlaces.record(viewed));
  });

  function onToggle() {
    const nowSaved = savedPlaces.toggle({ ...place });
    toastStore.show(
      nowSaved
        ? `Saved ${place.label}. Find it in Menu → Saved.`
        : `Removed ${place.label} from Saved.`,
      "success",
    );
  }
</script>

<MapChromeActionChip
  toolbar
  pressed={saved}
  ariaLabel={`Save ${place.label}`}
  onclick={onToggle}
>
  <span class="entity-save-icon" class:entity-save-icon--on={saved}>
    <Star size={14} aria-hidden="true" />
  </span>
  {saved ? "Saved" : "Save"}
</MapChromeActionChip>

<style>
  .entity-save-icon {
    display: inline-flex;
    line-height: 0;
  }

  .entity-save-icon--on :global(svg) {
    fill: currentColor;
  }
</style>
