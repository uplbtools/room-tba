<script lang="ts">
  import LeaderboardPanel from "@ui/status-bar/LeaderboardPanel.svelte";
  import ModalHeader from "./ModalHeader.svelte";
</script>

<div class="leaderboard-modal">
  <ModalHeader
    id="leaderboard-modal-title"
    title="Contributor leaderboard"
    description="Top volunteers helping map the campus and verify room schedules."
  />
  <div class="leaderboard-modal-body map-chrome-scroll">
    <LeaderboardPanel />
  </div>
</div>

<style>
  .leaderboard-modal {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
  }

  .leaderboard-modal-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 0 1rem 0.5rem;
  }
</style>
