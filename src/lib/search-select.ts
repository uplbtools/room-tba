import { entityHoverPreviewStore } from "./entity-hover-preview.svelte";
import type { Suggestion } from "./search-suggestions";
import { directionsStore, queryStore } from "./store.svelte";

/** Open a course's full class list (the "class" result panel). */
export function openCourseClasses(courseCode: string) {
  queryStore.updateQuery({
    category: "class",
    type: "result",
    value: courseCode,
  });
}

/**
 * Commit a search suggestion: tap and Enter share this. A class section opens
 * the room it meets in (the map can fly there); one without a room opens its
 * course's class list.
 */
export function selectSuggestion(suggestion: Suggestion) {
  entityHoverPreviewStore.hideNow();
  const lat = suggestion.lat ?? suggestion.building?.lat ?? null;
  const lon = suggestion.lon ?? suggestion.building?.lon ?? null;
  // Choosing a start or end point for directions: any place with a pin works.
  if (
    directionsStore.picking &&
    lat != null &&
    lon != null &&
    directionsStore.takePick({ lat, lng: lon, label: suggestion.value })
  ) {
    queryStore.exitResultMode();
    queryStore.inputValue = "";
    return;
  }
  if (suggestion.category === "class") {
    if (suggestion.roomCode) {
      queryStore.updateQuery({
        type: "result",
        category: "room",
        value: suggestion.roomCode,
      });
    } else {
      openCourseClasses(suggestion.courseCode ?? suggestion.value);
    }
    return;
  }
  queryStore.updateQuery({
    type: "result",
    category: suggestion.category,
    value: suggestion.value,
    eventSlug: suggestion.eventSlug,
  });
}
