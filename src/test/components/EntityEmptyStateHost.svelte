<script lang="ts">
  import EntityEmptyState from "@ui/controls/EntityEmptyState.svelte";
</script>

<div class="host">
  <EntityEmptyState
    title="Empty floors for now"
    description="No rooms found for this building."
  >
    {#snippet icon()}
      <svg viewBox="0 0 180 128" fill="none" aria-hidden="true">
        <rect
          x="52"
          y="22"
          width="76"
          height="90"
          rx="8"
          stroke="currentColor"
          stroke-width="3"
        />
      </svg>
    {/snippet}
  </EntityEmptyState>
</div>

<style>
  .host {
    width: 100%;
    max-width: 320px;
    box-sizing: border-box;
    padding: 0.5rem;
  }
</style>
