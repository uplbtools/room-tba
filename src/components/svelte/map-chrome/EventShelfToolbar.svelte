<script lang="ts">
  import {
    adminAuthStore,
    eventPlacementStore,
  } from "../../../lib/store.svelte";
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import CalendarPlus from "@lucide/svelte/icons/calendar-plus";
  import ChevronUp from "@lucide/svelte/icons/chevron-up";
  import SubmitterNameField from "../SubmitterNameField.svelte";
  import MapChromeActionChip from "./MapChromeActionChip.svelte";
  import MapChromeToggleButton from "./MapChromeToggleButton.svelte";

  type Props = {
    layout: "toolbar" | "empty";
    proposeSubmitterName?: string;
    placingEvent: boolean;
    hasAnyEvents: boolean;
    hasHiddenEvents: boolean;
    showRetract?: boolean;
    onViewAll: () => void;
    onStartPlacement: (propose: boolean) => void;
    oncollapse?: () => void;
  };

  let {
    layout,
    proposeSubmitterName = $bindable(""),
    placingEvent,
    hasAnyEvents,
    hasHiddenEvents,
    showRetract = false,
    onViewAll,
    onStartPlacement,
    oncollapse,
  }: Props = $props();

  const canPublish = $derived(adminAuthStore.canPublish);
  const showProposeName = $derived(!canPublish && !adminAuthStore.isLoggedIn);
  const propose = $derived(layout === "empty" || !canPublish);

  function placementLabel() {
    if (eventPlacementStore.creating) {
      return propose ? "Submitting..." : "Creating...";
    }
    if (eventPlacementStore.active) {
      return "Choose on map";
    }
    return propose ? "Propose event" : "Add event";
  }

  function startPlacement() {
    onStartPlacement(propose);
  }
</script>

{#if layout === "empty" && showProposeName}
  <SubmitterNameField
    id="events-empty-submitter-name"
    bind:value={proposeSubmitterName}
    variant="block"
    label="Your name"
    placeholder="Your name"
  />
{/if}

{#if layout === "toolbar" && showProposeName}
  <SubmitterNameField
    id="events-shelf-submitter-name"
    bind:value={proposeSubmitterName}
    variant="inline"
    label="Your name"
    placeholder="Your name"
  />
{/if}

<MapChromeActionChip disabled={placingEvent} onclick={startPlacement}>
  <CalendarPlus size={14} aria-hidden="true" />
  <span>{placementLabel()}</span>
</MapChromeActionChip>

{#if layout === "toolbar" && (hasAnyEvents || hasHiddenEvents)}
  <MapChromeActionChip onclick={onViewAll}>
    <CalendarDays size={14} aria-hidden="true" />
    <span>View all</span>
  </MapChromeActionChip>
{/if}

{#if layout === "toolbar" && showRetract && oncollapse}
  <MapChromeToggleButton
    ariaLabel="Collapse campus events"
    title="Collapse campus events"
    onclick={oncollapse}
  >
    <ChevronUp size={18} aria-hidden="true" />
  </MapChromeToggleButton>
{/if}
