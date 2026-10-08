<script lang="ts">
  import DataStorage from "./DataStorage.svelte";
  import ModalHeader from "./ModalHeader.svelte";
  import "../map-chrome/map-chrome.css";
</script>

<!-- Offline downloads, resync and reset: one screen (also pushed from You). -->
<section class="offline-maps-modal">
  <ModalHeader id="offline-maps-modal-title" title="Offline maps & storage" />
  <div class="offline-maps-modal__scroll map-chrome-scroll">
    <DataStorage />
  </div>
</section>

<style>
  .offline-maps-modal {
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
    flex-direction: column;
  }

  .offline-maps-modal__scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
</style>
