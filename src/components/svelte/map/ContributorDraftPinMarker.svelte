<script lang="ts">
  import Briefcase from "@lucide/svelte/icons/briefcase";
  import House from "@lucide/svelte/icons/house";
  import Landmark from "@lucide/svelte/icons/landmark";
  import Store from "@lucide/svelte/icons/store";
  import University from "@lucide/svelte/icons/university";
  import Users from "@lucide/svelte/icons/users";
  import {
    draftPinMapProps,
    type DraftPinPreview,
  } from "@lib/editor/draft-pin-preview";
  import EventMapPin from "./EventMapPin.svelte";
  import MapEntityPin from "./MapEntityPin.svelte";

  type Props = {
    preview: DraftPinPreview;
  };

  let { preview }: Props = $props();

  const mapProps = $derived(draftPinMapProps(preview));
</script>

<div class="contributor-draft-pin">
  {#if mapProps.component === "event"}
    <EventMapPin
      active
      ariaLabel={mapProps.label}
      dateLabel={mapProps.dateLabel ?? "TBD"}
      imageSrc={mapProps.imageSrc}
      labelTitle={mapProps.label}
      labelVisible
      onclick={() => {}}
      status="upcoming"
      title={mapProps.label}
      useCentralHoverPreview={false}
    />
  {:else}
    <MapEntityPin
      active
      label={mapProps.label}
      labelVisible
      tone={mapProps.tone}
      useCentralHoverPreview={false}
    >
      {#if mapProps.icon === "university"}
        <University size="20" />
      {:else if mapProps.icon === "house"}
        <House size="18" />
      {:else if mapProps.icon === "landmark"}
        <Landmark size="16" />
      {:else if mapProps.icon === "store"}
        <Store size="16" />
      {:else if mapProps.icon === "users"}
        <Users size="16" />
      {:else}
        <Briefcase size="16" />
      {/if}
    </MapEntityPin>
  {/if}
</div>

<style>
  .contributor-draft-pin {
    position: relative;
    z-index: 90;
  }

  .contributor-draft-pin :global(.map-entity-pin) {
    border-width: 3px;
    transform: scale(1.18);
    box-shadow:
      0 0 0 2px rgba(255, 255, 255, 0.95),
      0 4px 12px rgba(0, 0, 0, 0.35);
  }

  .contributor-draft-pin :global(.map-entity-pin.building) {
    box-shadow:
      0 0 0 2px rgba(255, 255, 255, 0.95),
      0 0 0 4px hsl(5 53% 40% / 0.55),
      0 4px 12px rgba(0, 0, 0, 0.35);
  }

  .contributor-draft-pin :global(.map-entity-pin.dorm) {
    box-shadow:
      0 0 0 2px rgba(255, 255, 255, 0.95),
      0 0 0 4px hsl(170 50% 45% / 0.55),
      0 4px 12px rgba(0, 0, 0, 0.35);
  }

  .contributor-draft-pin :global(.map-entity-pin.organization) {
    box-shadow:
      0 0 0 2px rgba(255, 255, 255, 0.95),
      0 0 0 4px hsl(265 45% 58% / 0.55),
      0 4px 12px rgba(0, 0, 0, 0.35);
  }

  .contributor-draft-pin :global(.map-entity-pin.office) {
    box-shadow:
      0 0 0 2px rgba(255, 255, 255, 0.95),
      0 0 0 4px hsl(208 52% 52% / 0.55),
      0 4px 12px rgba(0, 0, 0, 0.35);
  }

  .contributor-draft-pin :global(.map-entity-pin.landmark) {
    box-shadow:
      0 0 0 2px rgba(255, 255, 255, 0.95),
      0 0 0 4px hsl(34 62% 52% / 0.55),
      0 4px 12px rgba(0, 0, 0, 0.35);
  }

  .contributor-draft-pin :global(.map-entity-pin.establishment) {
    box-shadow:
      0 0 0 2px rgba(255, 255, 255, 0.95),
      0 0 0 4px hsl(334 54% 53% / 0.55),
      0 4px 12px rgba(0, 0, 0, 0.35);
  }

  .contributor-draft-pin :global(.map-entity-pin.active::before) {
    outline-width: 0.2rem;
    outline-offset: 0.2rem;
  }

  .contributor-draft-pin :global(.event-map-pin) {
    border-width: 3px;
    transform: scale(1.18);
    box-shadow:
      0 0 0 2px rgba(255, 255, 255, 0.95),
      0 0 0 4px rgba(123, 17, 19, 0.45),
      0 4px 12px rgba(0, 0, 0, 0.35);
  }

  @media (prefers-reduced-motion: reduce) {
    .contributor-draft-pin :global(.map-entity-pin),
    .contributor-draft-pin :global(.event-map-pin) {
      transform: none;
    }
  }
</style>
