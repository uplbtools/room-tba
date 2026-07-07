<script lang="ts">
  import { onMount } from "svelte";
  import type { LeaderboardRow } from "@lib/services/contribution-service";
  
  let loading = $state(false);
  let error = $state<string | null>(null);
  let rows = $state<LeaderboardRow[]>([]);
  let window = $state<"month" | "semester" | "all">("month");

  onMount(() => {
    loadLeaderboard();
  });

  async function loadLeaderboard() {
    loading = true;
    error = null;
    try {
      const res = await fetch(`/api/contributors/leaderboard?window=${window}`);
      if (!res.ok) throw new Error("Failed to load leaderboard");
      const data = await res.json();
      rows = data.rows || [];
    } catch (err) {
      error = err instanceof Error ? err.message : "Error loading leaderboard";
    } finally {
      loading = false;
    }
  }

  function handleWindowChange(event: Event) {
    window = (event.currentTarget as HTMLSelectElement).value as any;
    loadLeaderboard();
  }
</script>

<div class="leaderboard-panel">
  <header class="leaderboard-header">
    <select class="leaderboard-select" onchange={handleWindowChange} value={window}>
      <option value="month">This month</option>
      <option value="semester">This semester</option>
      <option value="all">All time</option>
    </select>
  </header>

  {#if loading}
    <p class="leaderboard-status">Loading leaderboard…</p>
  {:else if error}
    <p class="leaderboard-status error">{error}</p>
  {:else if rows.length === 0}
    <p class="leaderboard-status">No contributions yet for this period.</p>
  {:else}
    <ul class="leaderboard-list">
      {#each rows as row (row.rank)}
        <li class="leaderboard-item">
          <span class="leaderboard-rank">#{row.rank}</span>
          <span class="leaderboard-name">{row.displayName || "Anonymous"}</span>
          <span class="leaderboard-score">{row.contributionCount}</span>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .leaderboard-panel {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.5rem 0;
  }
  
  .leaderboard-header {
    display: flex;
    justify-content: flex-end;
  }

  .leaderboard-select {
    font: inherit;
    font-size: 0.8125rem;
    padding: 0.25rem 0.375rem;
    border: 1px solid hsl(0, 0%, 82%);
    border-radius: 0.375rem;
    background: hsl(0, 0%, 100%);
  }

  .leaderboard-status {
    font-size: 0.875rem;
    color: hsl(0, 0%, 38%);
  }

  .error {
    color: hsl(0, 45%, 40%);
  }

  .leaderboard-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
  }

  .leaderboard-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid hsl(0, 0%, 90%);
  }

  .leaderboard-item:last-child {
    border-bottom: none;
  }

  .leaderboard-rank {
    font-size: 0.875rem;
    font-weight: 700;
    color: hsl(0, 0%, 50%);
    width: 2rem;
  }

  .leaderboard-name {
    flex: 1;
    font-size: 0.875rem;
    font-weight: 600;
    color: hsl(0, 0%, 20%);
  }

  .leaderboard-score {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--map-ui-primary, hsl(5, 70%, 50%));
  }
</style>
