<script lang="ts">
  import { onMount } from "svelte";
  import { mapStore, mapViewStore } from "@lib/store.svelte";
  import {
    loadWaybackSnapshots,
    type WaybackSnapshot,
  } from "@lib/wayback-imagery";

  let online = $state(false);
  let snapshots = $state<WaybackSnapshot[]>([]);
  const selected = $derived(mapViewStore.waybackSnapshot);

  onMount(() => {
    const updateOnline = () => (online = navigator.onLine);
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  });

  $effect(() => {
    const map = mapStore.mapInstance;
    if (!online || !mapViewStore.satellite || !map) {
      snapshots = [];
      return;
    }

    const controller = new AbortController();
    const center = map.getCenter();
    void loadWaybackSnapshots(
      { latitude: center.lat, longitude: center.lng },
      map.getZoom(),
      controller.signal,
    )
      .then((available) => {
        if (!controller.signal.aborted) snapshots = available;
      })
      .catch(() => {
        if (!controller.signal.aborted) snapshots = [];
      });
    return () => controller.abort();
  });

  function selectSnapshot(event: Event) {
    const releaseNum = Number((event.currentTarget as HTMLSelectElement).value);
    mapViewStore.setWaybackSnapshot(
      snapshots.find((snapshot) => snapshot.releaseNum === releaseNum) ?? null,
    );
  }
</script>

{#if snapshots.length > 0}
  <div class="wayback-imagery-control">
    <label for="wayback-imagery-year">Historical imagery</label>
    <select
      id="wayback-imagery-year"
      aria-label="Historical imagery year"
      value={selected?.releaseNum ?? ""}
      onchange={selectSnapshot}
    >
      <option value="">Current imagery</option>
      {#each snapshots as snapshot (snapshot.releaseNum)}
        <option value={snapshot.releaseNum}>{snapshot.releaseDate}</option>
      {/each}
    </select>
    {#if selected}
      <p>
        Wayback release {selected.releaseDate}
        {#if selected.acquisitionDate}
          · captured {selected.acquisitionDate}
        {/if}
      </p>
    {/if}
  </div>
{/if}

<style>
  .wayback-imagery-control {
    display: grid;
    gap: 0.25rem;
    padding: 0.5rem 0;
    color: var(--color-text, #25232a);
    font-size: 0.8125rem;
  }

  select {
    width: 100%;
    min-height: 2.25rem;
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--color-border, #d4d0d5);
    border-radius: 0.375rem;
    background: #fff;
    color: inherit;
    font: inherit;
  }

  p {
    margin: 0;
    color: var(--color-text-muted, #6a6670);
    font-size: 0.75rem;
  }
</style>
