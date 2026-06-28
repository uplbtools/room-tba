<script lang="ts">
  type Props = {
    directionCount: number;
    totalRooms: number;
    progressPercent: number;
    variant: "collapsed" | "expanded";
  };

  const { directionCount, totalRooms, progressPercent, variant }: Props =
    $props();
</script>

{#if variant === "expanded"}
  <div
    class="status-bar__directions"
    role="progressbar"
    aria-valuemin={0}
    aria-valuemax={totalRooms}
    aria-valuenow={directionCount}
    aria-label="{directionCount} of {totalRooms} rooms with directions"
  >
    <div class="map-chrome-progress">
      <div
        class="map-chrome-progress__value"
        style:width={`${progressPercent}%`}
      ></div>
    </div>
    <span class="status-bar__directions-count">
      <span class="status-bar__count-wide"
        >{directionCount} of {totalRooms} rooms with directions</span
      >
      <span class="status-bar__count-narrow"
        >{directionCount}/{totalRooms} w/ directions</span
      >
    </span>
  </div>
{:else}
  <span
    class="status-bar__directions-collapsed"
    title="{directionCount} of {totalRooms} rooms with directions"
  >
    <span class="status-bar__count-wide"
      >{directionCount} of {totalRooms} rooms with directions</span
    >
    <span class="status-bar__count-narrow"
      >{directionCount}/{totalRooms} w/ directions</span
    >
  </span>
{/if}
