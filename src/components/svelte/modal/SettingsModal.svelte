<script lang="ts">
  import MapViewControls from "@ui/MapViewControls.svelte";
  import MapLegend from "@ui/MapLegend.svelte";
  import TerrainControl from "@ui/TerrainControl.svelte";
  import ScheduleImportPanel from "@ui/ScheduleImportPanel.svelte";
  import "../map-chrome/map-chrome.css";
</script>

<div class="settings-modal">
  <h2 class="settings-modal__title">Settings</h2>
  <div class="settings-modal__scroll map-chrome-scroll">
    <section class="settings-modal__section">
      <h3>View</h3>
      <MapViewControls embedded variant="modes" />
    </section>
    <section class="settings-modal__section">
      <h3>Legend</h3>
      <MapLegend embedded />
    </section>
    <section class="settings-modal__section">
      <h3>Terrain</h3>
      <TerrainControl embedded />
    </section>
    <section class="settings-modal__section">
      <h3>Schedule</h3>
      <ScheduleImportPanel embedded />
    </section>
  </div>
</div>

<style>
  .settings-modal {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    padding: 0.5rem 0.5rem 0.25rem;
    flex: 1 1 auto;
    min-height: 0;
  }

  .settings-modal__title {
    margin: 0;
    padding-right: 2.25rem;
    font-size: 1rem;
    font-weight: 700;
    color: hsl(0, 0%, 15%);
  }

  .settings-modal__scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-right: 0.375rem;
  }

  .settings-modal__section {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .settings-modal__section h3 {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: hsl(0, 0%, 40%);
  }
</style>
