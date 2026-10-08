<script lang="ts">
  /**
   * Overlays still drawn on the map without their panel (a kept route, a tool
   * under a sheet, a Layers filter): one chip each, label reopens the panel,
   * X clears it. Its own row under the search chips (AGENTS.md: the browse
   * chip row has no room to spare).
   */
  import ListFilter from "@lucide/svelte/icons/list-filter";
  import Route from "@lucide/svelte/icons/route";
  import Ruler from "@lucide/svelte/icons/ruler";
  import Timer from "@lucide/svelte/icons/timer";
  import X from "@lucide/svelte/icons/x";
  import {
    mapOverlays,
    type MapOverlayKind,
  } from "@lib/stores/map-overlays.svelte";

  const overlays = $derived(mapOverlays.stranded);
  const icons: Record<MapOverlayKind, typeof Route> = {
    route: Route,
    filter: ListFilter,
    tool: Ruler,
  };
  /** The overlay's own Layers glyph, where it differs from its kind's. */
  const idIcons: Record<string, typeof Route> = { "travel-time": Timer };
</script>

{#if overlays.length > 0}
  <div class="active-overlays" role="toolbar" aria-label="On the map">
    {#each overlays as overlay (overlay.id)}
      {@const Icon = idIcons[overlay.id] ?? icons[overlay.kind]}
      {@const label = overlay.label()}
      <span class="active-overlays__chip">
        {#if overlay.reopen}
          <button
            type="button"
            class="active-overlays__label"
            title={`Show ${label}`}
            onclick={() => overlay.reopen?.()}
          >
            <Icon size={16} aria-hidden="true" />
            <span class="active-overlays__text">{label}</span>
          </button>
        {:else}
          <span class="active-overlays__label active-overlays__label--static">
            <Icon size={16} aria-hidden="true" />
            <span class="active-overlays__text">{label}</span>
          </span>
        {/if}
        <button
          type="button"
          class="active-overlays__remove"
          aria-label={`Remove ${label}`}
          title={`Remove ${label}`}
          onclick={() => overlay.clear()}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </span>
    {/each}
    {#if overlays.length > 1}
      <button
        type="button"
        class="active-overlays__clear-all"
        onclick={() => {
          for (const overlay of overlays) overlay.clear();
        }}
      >
        Clear all
      </button>
    {/if}
  </div>
{/if}

<style>
  .active-overlays {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    min-width: 0;
    max-width: calc(100% + 1rem);
    /* Room for the chip shadows: the scroller clips its overflow. */
    margin: 0.125rem -0.5rem -0.375rem;
    padding: 0.25rem 0.5rem 0.5rem;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
  }

  .active-overlays::-webkit-scrollbar {
    display: none;
  }

  .active-overlays__chip {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    max-width: min(16rem, 70vw);
    height: 2rem;
    border: 1px solid var(--theme-accent-text, #8d1437);
    border-radius: 999px;
    background: var(--theme-accent-soft, hsl(5 20% 95%));
    color: var(--theme-accent-text, #8d1437);
    box-shadow: var(--map-chrome-shadow, 0 1px 3px hsla(0, 0%, 0%, 0.16));
  }

  .active-overlays__label {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    min-width: 0;
    height: 100%;
    padding: 0 0.25rem 0 0.75rem;
    border: none;
    border-radius: 999px 0 0 999px;
    background: none;
    color: inherit;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
  }

  .active-overlays__label--static {
    cursor: default;
  }

  .active-overlays__text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .active-overlays__remove {
    display: inline-grid;
    flex: 0 0 auto;
    place-items: center;
    width: 2rem;
    height: 2rem;
    /* 40px touch target without growing the chip. */
    margin: -0.25rem -0.125rem -0.25rem 0;
    padding: 0.25rem;
    box-sizing: content-box;
    border: none;
    border-radius: 999px;
    background: none;
    color: inherit;
    cursor: pointer;
  }

  .active-overlays__label:hover,
  .active-overlays__remove:hover {
    background: hsla(0, 0%, 0%, 0.06);
  }

  .active-overlays__label:focus-visible,
  .active-overlays__remove:focus-visible,
  .active-overlays__clear-all:focus-visible {
    outline: 2px solid var(--theme-accent-text, #8d1437);
    outline-offset: 1px;
  }

  .active-overlays__clear-all {
    flex: 0 0 auto;
    height: 2rem;
    padding: 0 0.75rem;
    border: 1px solid var(--map-chrome-border, hsl(5 10% 68%));
    border-radius: 999px;
    background: var(--map-chrome-surface, var(--theme-surface, #fff));
    color: var(--theme-text, hsl(0, 0%, 13%));
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;
    box-shadow: var(--map-chrome-shadow, 0 1px 3px hsla(0, 0%, 0%, 0.16));
  }
</style>
