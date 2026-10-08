<script lang="ts">
  import X from "@lucide/svelte/icons/x";
  import { mapStore, mapViewStore } from "@lib/store.svelte";

  let zoom = $state(0);
  let pitch = $state(0);
  let bearing = $state(0);
  let lat = $state(0);
  let lng = $state(0);

  // Pure reads on camera events (MapControlsStack pattern) — no rAF wrap
  // needed, that constraint covers camera writes from effects.
  function syncCamera() {
    const map = mapStore.mapInstance;
    if (!map) return;
    zoom = map.getZoom();
    pitch = map.getPitch();
    bearing = map.getBearing();
    const center = map.getCenter();
    lat = center.lat;
    lng = center.lng;
  }

  $effect(() => {
    const map = mapStore.mapInstance;
    if (!map) return;
    syncCamera();
    const onChange = () => syncCamera();
    map.on("move", onChange);
    map.on("zoom", onChange);
    map.on("rotate", onChange);
    map.on("pitch", onChange);
    return () => {
      map.off("move", onChange);
      map.off("zoom", onChange);
      map.off("rotate", onChange);
      map.off("pitch", onChange);
    };
  });
</script>

<section class="camera-hud" aria-label="Camera details">
  <div class="camera-hud__header">
    <span class="camera-hud__title">Camera</span>
    <button
      type="button"
      class="camera-hud__close"
      aria-label="Hide camera details"
      onclick={mapViewStore.toggleCameraDebug}
    >
      <X size={14} aria-hidden="true" />
    </button>
  </div>
  <dl class="camera-hud__grid">
    <dt>Zoom</dt>
    <dd>{zoom.toFixed(2)}</dd>
    <dt>Pitch</dt>
    <dd>{pitch.toFixed(1)}°</dd>
    <dt>Bearing</dt>
    <dd>{bearing.toFixed(1)}°</dd>
    <dt>Center</dt>
    <dd>{lat.toFixed(5)}, {lng.toFixed(5)}</dd>
  </dl>
</section>

<style>
  .camera-hud {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    width: min(15rem, calc(100vw - 1rem));
    align-self: flex-start;
    box-sizing: border-box;
    border: 1px solid
      var(--map-chrome-border, var(--theme-border-strong, hsl(5 10% 68%)));
    border-radius: var(--map-chrome-radius, 1rem);
    background-color: var(
      --map-chrome-surface,
      var(--theme-surface, hsl(5 20% 97%))
    );
    color: var(--theme-text, hsl(0, 0%, 12%));
    backdrop-filter: blur(10px);
    padding: 0.5rem 0.625rem;
    box-shadow: var(
      --map-chrome-panel-shadow,
      0 0 0 1px hsla(15, 8%, 20%, 0.16),
      0 2px 8px hsla(0, 0%, 0%, 0.14),
      0 8px 20px hsla(0, 0%, 0%, 0.18)
    );
    pointer-events: auto;
  }

  .camera-hud__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .camera-hud__title {
    font-size: 0.9375rem;
    font-weight: 600;
  }

  .camera-hud__close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border: none;
    border-radius: 50%;
    background: none;
    color: inherit;
    cursor: pointer;
  }

  .camera-hud__close:hover {
    background-color: var(--theme-accent-soft, hsl(5, 20%, 90%));
  }

  .camera-hud__close:focus-visible {
    outline: 2px solid var(--theme-accent-text, hsl(5, 53%, 32%));
    outline-offset: 1px;
  }

  .camera-hud__grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.125rem 0.875rem;
    margin: 0;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.8125rem;
    font-variant-numeric: tabular-nums;
  }

  .camera-hud__grid dt {
    color: var(--theme-text-muted, hsl(0, 0%, 38%));
  }

  .camera-hud__grid dd {
    margin: 0;
    color: var(--theme-text, hsl(0, 0%, 12%));
  }
</style>
