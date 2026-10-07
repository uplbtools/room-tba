<script lang="ts">
  import { Marker } from "svelte-maplibre";
  import { droppedPinStore } from "@lib/dropped-pin.svelte";

  const at = $derived(droppedPinStore.at);
</script>

{#if at}
  <!-- Anchored at its tip so the point of the pin is the dropped spot. -->
  <Marker lngLat={[at.lng, at.lat]} anchor="bottom">
    <div class="dropped-pin-marker" role="img" aria-label="Dropped pin">
      <svg width="28" height="38" viewBox="0 0 28 38" aria-hidden="true">
        <path
          d="M14 1C6.8 1 1 6.7 1 13.8 1 23.5 14 37 14 37s13-13.5 13-23.2C27 6.7 21.2 1 14 1Z"
          fill="#d93025"
          stroke="#fff"
          stroke-width="2"
        />
        <circle cx="14" cy="13.5" r="4.5" fill="#7a1a12" />
      </svg>
    </div>
  </Marker>
{/if}

<style>
  .dropped-pin-marker {
    line-height: 0;
    filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.35));
    animation: dropped-pin-in 220ms ease-out;
    pointer-events: none;
  }

  @keyframes dropped-pin-in {
    from {
      opacity: 0;
      translate: 0 -12px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .dropped-pin-marker {
      animation: none;
    }
  }
</style>
