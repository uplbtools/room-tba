<script lang="ts">
  import ContributorProgressPanel from "@ui/status-bar/ContributorProgressPanel.svelte";
  import ModalHeader from "./ModalHeader.svelte";
</script>

<div class="coverage-modal">
  <ModalHeader
    id="coverage-modal-title"
    title="Campus data coverage"
    description="Track directions, schedules, and map pins across campus buildings."
  />
  <div class="coverage-modal-body map-chrome-scroll">
    <ContributorProgressPanel />
  </div>
</div>

<style>
  .coverage-modal {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
  }

  .coverage-modal-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 0 1rem 0.5rem;
  }

  .coverage-modal-body :global(.contributor-progress) {
    width: 100%;
  }
</style>
