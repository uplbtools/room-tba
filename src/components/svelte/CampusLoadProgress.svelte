<script lang="ts">
  import { appBootstrapStore, syncToastStore } from "@lib/store.svelte";

  // Slim bar along the top edge while campus data loads behind a live map.
  // Replaces the full-screen splash: the map, search and chrome are usable
  // from first paint and pins drop in when the rows arrive. A returning
  // visitor paints from the cached snapshot, so a background refresh never
  // shows it.
  const visible = $derived(
    !appBootstrapStore.hasCachedData &&
      appBootstrapStore.phase !== "ready" &&
      appBootstrapStore.phase !== "error",
  );
  const percent = $derived.by(() => {
    const progress = syncToastStore.fetchProgress;
    if (!progress || progress.total === 0) return null;
    return Math.min(100, Math.round((progress.done / progress.total) * 100));
  });
</script>

{#if visible}
  <div
    class="campus-load-progress"
    role="progressbar"
    aria-label="Loading campus data"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={percent ?? undefined}
  >
    {#if percent === null}
      <span class="campus-load-progress__fill campus-load-progress__fill--indeterminate"
      ></span>
    {:else}
      <span
        class="campus-load-progress__fill"
        style:width="{Math.max(percent, 8)}%"
      ></span>
    {/if}
  </div>
{/if}

<style>
  .campus-load-progress {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 40;
    height: 3px;
    overflow: hidden;
    pointer-events: none;
    background: hsla(5, 40%, 40%, 0.15);
  }

  .campus-load-progress__fill {
    display: block;
    height: 100%;
    background: hsl(5, 53%, 38%);
    transition: width 0.3s ease;
  }

  .campus-load-progress__fill--indeterminate {
    width: 35%;
    animation: campus-load-slide 1.1s ease-in-out infinite;
  }

  @keyframes campus-load-slide {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(300%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .campus-load-progress__fill--indeterminate {
      width: 100%;
      animation: none;
      opacity: 0.6;
    }
  }
</style>
