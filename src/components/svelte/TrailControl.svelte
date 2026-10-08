<script lang="ts">
  import Route from "@lucide/svelte/icons/route";
  import Info from "@lucide/svelte/icons/info";
  import Maximize from "@lucide/svelte/icons/maximize";
  import { mapToolsStore, trailStore } from "@lib/store.svelte";
  import { openTrailSheet } from "@lib/trail-sheet";

  type Props = {
    embedded?: boolean;
  };

  let { embedded = false }: Props = $props();

  /** Layers gets out of the way first, then the trail fills the visible map. */
  function frameTrail() {
    mapToolsStore.close();
    trailStore.requestFrame();
  }
</script>

<div class="trail-control" class:embedded>
  <button
    type="button"
    class="trail-toggle"
    class:active={trailStore.enabled}
    role="switch"
    aria-checked={trailStore.enabled}
    onclick={() => trailStore.toggle()}
  >
    <Route size={16} aria-hidden="true" />
    <span>Makiling Trail</span>
    <span class="trail-toggle-state">{trailStore.enabled ? "On" : "Off"}</span>
  </button>

  {#if trailStore.enabled}
    <button type="button" class="trail-link" onclick={frameTrail}>
      <Maximize size={14} aria-hidden="true" />
      <span>Frame trail on map</span>
    </button>
    <button type="button" class="trail-link" onclick={() => openTrailSheet()}>
      <Info size={14} aria-hidden="true" />
      <span>Trail details and stations</span>
    </button>
  {/if}
</div>

<style>
  .trail-control {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .trail-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.625rem;
    border-radius: 0.5rem;
    border: 1px solid var(--map-chrome-border, var(--theme-border-strong, hsl(5 10% 68%)));
    background: var(--map-chrome-surface, var(--theme-surface, hsl(5 20% 97%)));
    cursor: pointer;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--theme-text, hsl(0 0% 20%));
    transition: background 0.15s;
  }

  .trail-toggle:hover {
    background: var(--theme-accent-soft, hsl(5 20% 94%));
  }

  .trail-toggle.active {
    border-color: var(--theme-green-text, #15803d);
    background: var(--theme-green-soft, hsl(140 30% 94%));
  }

  .trail-toggle-state {
    margin-left: auto;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--theme-text-2, hsl(0 0% 40%));
  }

  .trail-toggle.active .trail-toggle-state {
    color: var(--theme-green-text, #15803d);
  }

  .trail-link {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.625rem;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--theme-text-2, hsl(0 0% 34%));
    text-decoration: underline;
  }
</style>
