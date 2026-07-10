<script lang="ts">
  import ContributorProgressPanel from "@ui/status-bar/ContributorProgressPanel.svelte";
</script>

<div class="coverage-modal">
  <div class="coverage-modal-header">
    <h2 id="coverage-modal-title">Campus data coverage</h2>
    <p class="coverage-modal-note">
      Track directions, schedules, and map pins across campus buildings.
    </p>
  </div>
  <div class="coverage-modal-body map-chrome-scroll">
    <ContributorProgressPanel />
  </div>
</div>

<style>
  .coverage-modal {
    display: flex;
    flex-direction: column;
    padding: 1.5rem;
    height: 100%;
    max-height: calc(100vh - 4rem);
  }

  .coverage-modal-header {
    margin-bottom: 1rem;
    flex-shrink: 0;
  }

  .coverage-modal-header h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    font-weight: 700;
  }

  .coverage-modal-note {
    margin: 0;
    font-size: 0.875rem;
    color: hsl(0, 0%, 40%);
  }

  .coverage-modal-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .coverage-modal-body :global(.contributor-progress) {
    width: 100%;
  }
</style>
