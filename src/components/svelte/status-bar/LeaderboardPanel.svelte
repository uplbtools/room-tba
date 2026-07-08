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

  const MEDALS = ["🥇", "🥈", "🥉"];
  function initials(name: string) {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("");
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
        <li class="leaderboard-item" class:top={row.rank <= 3}>
          <span class="leaderboard-rank">
            {#if row.rank <= 3}{MEDALS[row.rank - 1]}{:else}{row.rank}{/if}
          </span>
          <span class="leaderboard-avatar" aria-hidden="true"
            >{initials(row.displayName || "Anonymous")}</span
          >
          <span class="leaderboard-name">{row.displayName || "Anonymous"}</span>
          <span class="leaderboard-score">
            {row.contributionCount}
            <span class="leaderboard-score-unit">edits</span>
          </span>
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
    gap: 0.375rem;
  }

  .leaderboard-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    border-radius: 0.625rem;
    background: hsl(0, 0%, 97%);
  }

  .leaderboard-item.top {
    background: hsl(5, 60%, 96%);
  }

  .leaderboard-rank {
    flex-shrink: 0;
    width: 1.75rem;
    text-align: center;
    font-size: 0.9375rem;
    font-weight: 700;
    color: hsl(0, 0%, 45%);
  }

  .leaderboard-avatar {
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--map-ui-primary, hsl(5, 70%, 50%));
    color: #fff;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .leaderboard-name {
    flex: 1;
    min-width: 0;
    font-size: 0.9375rem;
    font-weight: 600;
    color: hsl(0, 0%, 20%);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .leaderboard-score {
    flex-shrink: 0;
    display: flex;
    align-items: baseline;
    gap: 0.25rem;
    font-size: 1rem;
    font-weight: 700;
    color: var(--map-ui-primary, hsl(5, 70%, 50%));
  }

  .leaderboard-score-unit {
    font-size: 0.6875rem;
    font-weight: 600;
    color: hsl(0, 0%, 55%);
  }
</style>
