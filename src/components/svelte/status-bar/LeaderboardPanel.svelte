<script lang="ts">
  /**
   * Leaderboard content: boards, period control, ranked list, your rank,
   * hall of fame, suggestions and contributor profiles. Self-contained (no
   * header, no container chrome) so it drops into a dialog or a page.
   */
  import Avatar from "@ui/Avatar.svelte";
  import LoadingIndicator from "@ui/LoadingIndicator.svelte";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import ContributorProfile from "./ContributorProfile.svelte";
  import {
    CONTRIBUTION_KINDS,
    KIND_LABELS,
    KIND_POINTS,
    endsInLabel,
    pointsLabel,
    type KindBreakdown,
    type LeaderboardWindow,
  } from "@lib/contributors/scoring";
  import type {
    LeaderboardBoard,
    LeaderboardResponse,
    LeaderboardRow,
    MyStanding,
  } from "@lib/contributors/leaderboard-types";
  import { readContributorId } from "@lib/contributors/contributor-id";
  import {
    fetchContributorProgress,
    type BuildingProgressBreakdown,
  } from "@lib/contributor-progress";
  import { adminAuthStore, modalStore, queryStore } from "@lib/store.svelte";

  const WINDOW_OPTIONS: { value: LeaderboardWindow; label: string }[] = [
    { value: "month", label: "This month" },
    { value: "semester", label: "This semester" },
    { value: "all", label: "All time" },
  ];
  const WINDOW_PHRASE: Record<LeaderboardWindow, string> = {
    month: "this month",
    semester: "this semester",
    all: "all time",
  };
  const MEDALS = ["🥇", "🥈", "🥉"];
  const MEDAL_NAMES = ["gold", "silver", "bronze"];
  const SUGGESTION_LIMIT = 3;

  let timeWindow = $state<LeaderboardWindow>("month");
  let board = $state<LeaderboardBoard>("community");
  let loading = $state(false);
  let error = $state<string | null>(null);
  let data = $state<LeaderboardResponse | null>(null);
  let me = $state<MyStanding | null>(null);
  let expandedKey = $state<string | null>(null);
  let profile = $state<{ key: string; name: string } | null>(null);
  let suggestions = $state<BuildingProgressBreakdown[]>([]);
  let requestSeq = 0;

  const rows = $derived(data?.rows ?? []);
  const period = $derived(data?.period ?? null);
  const hallOfFame = $derived(data?.hallOfFame ?? []);

  $effect(() => {
    void load(timeWindow, board);
  });

  $effect(() => {
    if (board !== "community" || suggestions.length > 0) return;
    fetchContributorProgress("campus")
      .then((progress) => {
        suggestions = progress.topBuildings.slice(0, SUGGESTION_LIMIT);
      })
      .catch(() => {
        // Suggestions are a bonus; the board stands on its own.
      });
  });

  async function load(nextWindow: LeaderboardWindow, nextBoard: LeaderboardBoard) {
    const seq = ++requestSeq;
    loading = true;
    error = null;
    expandedKey = null;
    const query = `window=${nextWindow}&board=${nextBoard}`;
    try {
      const [boardRes, standing] = await Promise.all([
        fetch(`/api/contributors/leaderboard?${query}`),
        loadMyStanding(query),
      ]);
      if (!boardRes.ok) throw new Error("Could not load the leaderboard.");
      const body = (await boardRes.json()) as Partial<LeaderboardResponse>;
      if (seq !== requestSeq) return;
      data = {
        window: nextWindow,
        board: nextBoard,
        period: body.period ?? null,
        rows: body.rows ?? [],
        hallOfFame: body.hallOfFame ?? [],
      };
      me = standing;
    } catch (err) {
      if (seq !== requestSeq) return;
      error = err instanceof Error ? err.message : "Could not load the leaderboard.";
    } finally {
      if (seq === requestSeq) loading = false;
    }
  }

  async function loadMyStanding(query: string): Promise<MyStanding | null> {
    const contributorId = readContributorId();
    if (!adminAuthStore.isLoggedIn && !contributorId) return null;
    try {
      const params = contributorId
        ? `&contributorId=${encodeURIComponent(contributorId)}`
        : "";
      const res = await fetch(`/api/contributors/me?${query}${params}`, {
        credentials: "same-origin",
      });
      if (!res.ok) return null;
      return ((await res.json()) as { me?: MyStanding | null }).me ?? null;
    } catch {
      return null;
    }
  }

  function selectWindow(next: LeaderboardWindow) {
    timeWindow = next;
  }

  function onWindowKeydown(event: KeyboardEvent) {
    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const index = WINDOW_OPTIONS.findIndex((option) => option.value === timeWindow);
    const step = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
    const next =
      WINDOW_OPTIONS[(index + step + WINDOW_OPTIONS.length) % WINDOW_OPTIONS.length]!;
    timeWindow = next.value;
    const group = event.currentTarget as HTMLElement;
    queueMicrotask(() =>
      group
        .querySelector<HTMLButtonElement>(`[data-window="${next.value}"]`)
        ?.focus(),
    );
  }

  function breakdownLines(breakdown: KindBreakdown) {
    return CONTRIBUTION_KINDS.filter((kind) => breakdown[kind] > 0).map(
      (kind) => ({
        kind,
        label: KIND_LABELS[kind],
        count: breakdown[kind],
        points: breakdown[kind] * KIND_POINTS[kind],
      }),
    );
  }

  function breakdownTitle(breakdown: KindBreakdown): string {
    return breakdownLines(breakdown)
      .map((line) => `${line.label}: ${line.count} (${pointsLabel(line.points)})`)
      .join("\n");
  }

  function domId(key: string): string {
    return `lb-breakdown-${key.replace(/[^a-z0-9]/gi, "-")}`;
  }

  function toggleBreakdown(key: string) {
    expandedKey = expandedKey === key ? null : key;
  }

  function openProfile(key: string, name: string) {
    profile = { key, name };
  }

  // Same path the coverage panel uses: the side panel resolves the query.
  function openBuilding(name: string) {
    queryStore.updateQuery({ category: "building", type: "result", value: name });
    queryStore.inputValue = name;
    modalStore.closeModal();
  }

  function missingSummary(building: BuildingProgressBreakdown): string {
    const parts = [
      [building.roomTotal - building.schedule.filled, "schedules"],
      [building.roomTotal - building.directions.filled, "directions"],
      [building.roomTotal - building.position.filled, "room pins"],
    ] as const;
    const missing = parts
      .filter(([count]) => count > 0)
      .map(([count, label]) => `${count} ${label}`);
    return missing.length > 0 ? `Missing ${missing.join(", ")}` : "Needs a check";
  }

  function rankLabel(row: Pick<LeaderboardRow, "rank" | "medal">): string {
    return row.medal
      ? `Rank ${row.rank}, ${MEDAL_NAMES[row.medal - 1]}`
      : `Rank ${row.rank}`;
  }
</script>

{#snippet scoreBlock(key: string, points: number, breakdown: KindBreakdown)}
  <button
    type="button"
    class="lb-score"
    aria-expanded={expandedKey === key}
    aria-controls={domId(key)}
    aria-label="{pointsLabel(points)}, show breakdown"
    title={breakdownTitle(breakdown)}
    onclick={() => toggleBreakdown(key)}
  >
    <span class="lb-score__value">{points}</span>
    <span class="lb-score__unit">{points === 1 ? "point" : "points"}</span>
  </button>
{/snippet}

{#snippet breakdownBlock(key: string, breakdown: KindBreakdown)}
  {#if expandedKey === key}
    <ul id={domId(key)} class="lb-breakdown" aria-label="Points breakdown">
      {#each breakdownLines(breakdown) as line (line.kind)}
        <li>
          <span>{line.label}</span>
          <span class="lb-breakdown__math">{line.count} × {KIND_POINTS[line.kind]}</span>
          <strong>{line.points}</strong>
        </li>
      {/each}
    </ul>
  {/if}
{/snippet}

<div class="lb">
  {#if profile}
    <ContributorProfile
      contributorKey={profile.key}
      name={profile.name}
      {board}
      onback={() => (profile = null)}
    />
  {:else}
    <div class="lb-controls">
      <div class="lb-boards" role="tablist" aria-label="Leaderboard">
        {#each [{ value: "community", label: "Community" }, { value: "editors", label: "Editors" }] as option (option.value)}
          <button
            type="button"
            role="tab"
            class="lb-board"
            aria-selected={board === option.value}
            onclick={() => (board = option.value as LeaderboardBoard)}
          >
            {option.label}
          </button>
        {/each}
      </div>

      <div
        class="lb-segmented"
        role="radiogroup"
        aria-label="Period"
        tabindex="-1"
        onkeydown={onWindowKeydown}
      >
        {#each WINDOW_OPTIONS as option (option.value)}
          <button
            type="button"
            role="radio"
            class="lb-segment"
            data-window={option.value}
            aria-checked={timeWindow === option.value}
            tabindex={timeWindow === option.value ? 0 : -1}
            onclick={() => selectWindow(option.value)}
          >
            {option.label}
          </button>
        {/each}
      </div>

      {#if period}
        <p class="lb-period">
          <span>{period.label}</span>
          <span class="lb-period__ends">{endsInLabel(period.daysLeft)}</span>
        </p>
      {/if}
    </div>

    {#if loading && !data}
      <p class="lb-status"><LoadingIndicator label="Loading leaderboard…" /></p>
    {:else if error}
      <p class="lb-status lb-status--error">{error}</p>
    {:else}
      {#if rows.length === 0}
        <p class="lb-status">No approved edits yet {WINDOW_PHRASE[timeWindow]}.</p>
      {:else}
        <ol class="lb-list" aria-busy={loading}>
          {#each rows as row (row.key)}
            <li
              class="lb-row"
              class:lb-row--medal={row.medal !== null}
              class:lb-row--me={me?.key === row.key}
            >
              <span class="lb-rank">
                {#if row.medal}
                  <span role="img" aria-label={rankLabel(row)}>{MEDALS[row.medal - 1]}</span>
                {:else}
                  <span aria-label={rankLabel(row)}>{row.rank}</span>
                {/if}
              </span>
              <button
                type="button"
                class="lb-person"
                aria-label="View profile of {row.displayName}"
                onclick={() => openProfile(row.key, row.displayName)}
              >
                <Avatar name={row.displayName} colorKey={row.key} size={36} />
                <span class="lb-person__copy">
                  <span class="lb-person__name">{row.displayName}</span>
                  {#if me?.key === row.key}
                    <span class="lb-person__sub">You</span>
                  {:else if row.gettingStarted}
                    <span class="lb-person__sub">Getting started</span>
                  {/if}
                </span>
              </button>
              {@render scoreBlock(row.key, row.points, row.breakdown)}
              {@render breakdownBlock(row.key, row.breakdown)}
            </li>
          {/each}
        </ol>
      {/if}

      {#if me}
        <div class="lb-me" aria-label="Your rank">
          <div class="lb-row lb-row--me lb-row--pinned">
            <span class="lb-rank">
              {#if me.rank}<span aria-label="Rank {me.rank}">#{me.rank}</span>{:else}<span aria-hidden="true">-</span>{/if}
            </span>
            <button
              type="button"
              class="lb-person"
              aria-label="View your profile"
              disabled={me.optedOut}
              onclick={() => openProfile(me!.key, me!.displayName)}
            >
              <Avatar name={me.displayName} colorKey={me.key} size={36} />
              <span class="lb-person__copy">
                <span class="lb-person__name">You</span>
                <span class="lb-person__sub">
                  {#if me.optedOut}
                    Hidden from credits. Turn on "Show me in credits" in Account settings.
                  {:else if !me.rank}
                    No points yet {WINDOW_PHRASE[timeWindow]}
                  {:else if me.toPass}
                    {me.toPass.points} more to pass #{me.toPass.rank}
                  {:else}
                    You're in the lead
                  {/if}
                </span>
              </span>
            </button>
            {@render scoreBlock(`me-${me.key}`, me.points, me.breakdown)}
            {@render breakdownBlock(`me-${me.key}`, me.breakdown)}
          </div>
        </div>
      {:else if board === "community"}
        <p class="lb-hint">Suggest an edit on any place to join the board.</p>
      {/if}

      {#if hallOfFame.length > 0}
        <section class="lb-section" aria-labelledby="lb-hall-title">
          <h3 id="lb-hall-title" class="lb-section__title">Hall of fame</h3>
          <ul class="lb-fame">
            {#each hallOfFame as entry (entry.label)}
              <li class="lb-fame__row">
                <span class="lb-fame__period">{entry.label}</span>
                <span class="lb-fame__winners">
                  {#each entry.winners as winner, i (winner.key)}
                    <button
                      type="button"
                      class="lb-fame__winner"
                      onclick={() => openProfile(winner.key, winner.displayName)}
                      >{winner.displayName}</button
                    >{i < entry.winners.length - 1 ? ", " : ""}
                  {/each}
                  <span class="lb-fame__points">{pointsLabel(entry.winners[0]?.points ?? 0)}</span>
                </span>
              </li>
            {/each}
          </ul>
        </section>
      {/if}

      {#if board === "community" && suggestions.length > 0}
        <section class="lb-section" aria-labelledby="lb-suggest-title">
          <h3 id="lb-suggest-title" class="lb-section__title">Buildings needing work</h3>
          <ul class="lb-suggest">
            {#each suggestions as building (building.buildingId)}
              <li>
                <button
                  type="button"
                  class="lb-suggest__row"
                  onclick={() => openBuilding(building.buildingName)}
                >
                  <span class="lb-suggest__copy">
                    <span class="lb-suggest__name">{building.buildingName}</span>
                    <span class="lb-suggest__meta">{missingSummary(building)}</span>
                  </span>
                  <ChevronRight size={20} aria-hidden="true" />
                </button>
              </li>
            {/each}
          </ul>
        </section>
      {/if}
    {/if}
  {/if}
</div>

<style>
  .lb {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.25rem 0 0.5rem;
  }

  .lb-controls {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .lb-boards {
    display: flex;
    gap: 0.25rem;
    border-bottom: 1px solid var(--theme-border, hsl(0, 0%, 88%));
  }

  .lb-board {
    all: unset;
    box-sizing: border-box;
    min-height: 3rem;
    padding: 0 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--theme-text-2, hsl(0, 0%, 38%));
    border-bottom: 3px solid transparent;
    cursor: pointer;
  }

  .lb-board[aria-selected="true"] {
    color: var(--theme-accent-text, hsl(358, 76%, 27%));
    border-bottom-color: var(--theme-accent-fill, hsl(358, 76%, 27%));
  }

  .lb-board:focus-visible,
  .lb-segment:focus-visible,
  .lb-person:focus-visible,
  .lb-score:focus-visible,
  .lb-suggest__row:focus-visible,
  .lb-fame__winner:focus-visible {
    outline: 2px solid var(--theme-accent-text, hsl(358, 76%, 27%));
    outline-offset: -2px;
  }

  .lb-segmented {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    border: 1px solid var(--theme-border-strong, hsl(0, 0%, 60%));
    border-radius: 999px;
    overflow: hidden;
  }

  .lb-segment {
    all: unset;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 2.5rem;
    padding: 0 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    text-align: center;
    line-height: 1.15;
    color: var(--theme-text, hsl(0, 0%, 15%));
    cursor: pointer;
  }

  .lb-segment + .lb-segment {
    border-left: 1px solid var(--theme-border-strong, hsl(0, 0%, 60%));
  }

  .lb-segment[aria-checked="true"] {
    background: var(--theme-accent-soft, hsl(358, 60%, 94%));
    color: var(--theme-accent-text, hsl(358, 76%, 27%));
    font-weight: 600;
  }

  .lb-period {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    margin: 0;
    padding: 0 0.25rem;
    font-size: 0.875rem;
    color: var(--theme-text-2, hsl(0, 0%, 38%));
  }

  .lb-period__ends {
    font-weight: 600;
    color: var(--theme-text, hsl(0, 0%, 20%));
  }

  .lb-status,
  .lb-hint {
    margin: 0;
    padding: 0.5rem 0.25rem;
    font-size: 0.875rem;
    color: var(--theme-text-2, hsl(0, 0%, 38%));
  }

  .lb-status--error {
    color: var(--theme-accent-text, hsl(0, 45%, 40%));
  }

  .lb-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .lb-list[aria-busy="true"] {
    opacity: 0.6;
  }

  .lb-row {
    display: grid;
    grid-template-columns: 2rem minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 0.5rem;
    min-height: 3.5rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.75rem;
  }

  .lb-row--medal {
    background: var(--theme-accent-soft, hsl(358, 60%, 96%));
  }

  .lb-row--me {
    box-shadow: inset 0 0 0 1px var(--theme-accent-border, hsl(358, 50%, 80%));
  }

  .lb-rank {
    text-align: center;
    font-size: 0.9375rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--theme-text-2, hsl(0, 0%, 38%));
  }

  .lb-row--medal .lb-rank {
    font-size: 1.25rem;
  }

  .lb-person {
    all: unset;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
    min-height: 3rem;
    border-radius: 0.5rem;
    cursor: pointer;
  }

  .lb-person:disabled {
    cursor: default;
  }

  .lb-person__copy {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 0.0625rem;
  }

  /* Long names wrap to two lines from the same left edge, then clip. */
  .lb-person__name {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    overflow-wrap: anywhere;
    font-size: 1rem;
    font-weight: 500;
    line-height: 1.25;
    color: var(--theme-text, hsl(0, 0%, 12%));
  }

  .lb-person__sub {
    font-size: 0.8125rem;
    line-height: 1.3;
    color: var(--theme-text-2, hsl(0, 0%, 38%));
  }

  .lb-score {
    all: unset;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: center;
    min-width: 3rem;
    min-height: 3rem;
    padding: 0 0.25rem;
    border-radius: 0.5rem;
    cursor: pointer;
  }

  .lb-score:hover {
    background: var(--theme-surface-2, hsl(0, 0%, 94%));
  }

  .lb-score__value {
    font-size: 1.0625rem;
    font-weight: 700;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
    color: var(--theme-accent-text, hsl(358, 76%, 27%));
  }

  .lb-score__unit {
    font-size: 0.75rem;
    color: var(--theme-text-2, hsl(0, 0%, 38%));
  }

  .lb-breakdown {
    grid-column: 2 / -1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin: 0.25rem 0 0.375rem;
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    background: var(--theme-surface-2, hsl(0, 0%, 96%));
    list-style: none;
    font-size: 0.8125rem;
    color: var(--theme-text, hsl(0, 0%, 20%));
  }

  .lb-breakdown li {
    display: grid;
    grid-template-columns: 1fr auto 2rem;
    gap: 0.5rem;
    text-align: right;
  }

  .lb-breakdown li > :first-child {
    text-align: left;
  }

  .lb-breakdown__math {
    color: var(--theme-text-2, hsl(0, 0%, 38%));
  }

  .lb-me {
    position: sticky;
    bottom: 0;
    z-index: 1;
    padding-top: 0.25rem;
    background: var(--theme-surface, hsl(0, 0%, 100%));
  }

  /* Phone landscape: a pinned row would cover most of the list. */
  @media (max-height: 500px) {
    .lb-me {
      position: static;
    }
  }

  .lb-row--pinned {
    background: var(--theme-surface-2, hsl(0, 0%, 96%));
  }

  .lb-section {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-top: 0.5rem;
  }

  .lb-section__title {
    margin: 0;
    padding: 0.5rem 0.25rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--theme-accent-text, hsl(358, 76%, 27%));
  }

  .lb-fame,
  .lb-suggest {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .lb-fame__row {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-height: 3.5rem;
    justify-content: center;
    padding: 0.25rem;
  }

  .lb-fame__period {
    font-size: 0.8125rem;
    color: var(--theme-text-2, hsl(0, 0%, 38%));
  }

  .lb-fame__winners {
    font-size: 0.9375rem;
    color: var(--theme-text, hsl(0, 0%, 15%));
  }

  .lb-fame__winner {
    all: unset;
    font-weight: 600;
    cursor: pointer;
    overflow-wrap: anywhere;
  }

  .lb-fame__winner:hover {
    text-decoration: underline;
  }

  .lb-fame__points {
    margin-left: 0.5rem;
    font-size: 0.8125rem;
    color: var(--theme-text-2, hsl(0, 0%, 38%));
  }

  .lb-suggest__row {
    all: unset;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    min-height: 4.5rem;
    padding: 0 0.25rem;
    border-radius: 0.5rem;
    color: var(--theme-text-2, hsl(0, 0%, 38%));
    cursor: pointer;
  }

  .lb-suggest__row:hover {
    background: var(--theme-surface-2, hsl(0, 0%, 96%));
  }

  .lb-suggest__copy {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .lb-suggest__name {
    font-size: 1rem;
    color: var(--theme-text, hsl(0, 0%, 12%));
    overflow-wrap: anywhere;
  }

  .lb-suggest__meta {
    font-size: 0.875rem;
  }
</style>
