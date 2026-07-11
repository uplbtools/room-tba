<script lang="ts">
  import OfflineMaps from "@ui/OfflineMaps.svelte";
</script>

<section class="offline-maps-modal">
  <h2>Offline maps</h2>
  <p>Save campus data on this device for use without a connection.</p>
  <div class="offline-maps-modal__scroll map-chrome-scroll">
    <OfflineMaps inline />
  </div>
</section>

<style>
  .offline-maps-modal {
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
    flex-direction: column;
    gap: 0.375rem;
    padding: 0.5rem 0.5rem 0.25rem;
  }

  h2,
  p {
    margin: 0;
  }

  h2 {
    padding-right: 2.25rem;
    color: hsl(0 0% 15%);
    font-size: 1rem;
  }

  p {
    color: hsl(0 0% 40%);
    font-size: 0.8125rem;
  }

  .offline-maps-modal__scroll {
    min-height: 0;
    overflow-y: auto;
    padding: 0.25rem 0.375rem 0.25rem 0;
  }
</style>
