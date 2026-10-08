<script lang="ts">
  import Avatar from "@ui/Avatar.svelte";
  import LoadingIndicator from "@ui/LoadingIndicator.svelte";
  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import {
    CONTRIBUTION_KINDS,
    KIND_LABELS,
    KIND_POINTS,
    pointsLabel,
  } from "@lib/contributors/scoring";
  import type {
    ContributorProfile,
    LeaderboardBoard,
  } from "@lib/contributors/leaderboard-types";

  type Props = {
    contributorKey: string;
    board: LeaderboardBoard;
    /** Shown as a fallback while loading. */
    name?: string;
    onback: () => void;
  };

  let { contributorKey, board, name = "", onback }: Props = $props();

  let profile = $state<ContributorProfile | null>(null);
  let error = $state<string | null>(null);
  let loading = $state(true);

  $effect(() => {
    const key = contributorKey;
    const currentBoard = board;
    let cancelled = false;
    loading = true;
    error = null;
    profile = null;
    fetch(
      `/api/contributors/profile?key=${encodeURIComponent(key)}&board=${currentBoard}`,
    )
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 404) {
          error = "This contributor's profile is not public.";
          return;
        }
        if (!res.ok) throw new Error("Could not load this profile.");
        const data = (await res.json()) as { profile?: ContributorProfile };
        profile = data.profile ?? null;
      })
      .catch((err) => {
        if (!cancelled) {
          error =
            err instanceof Error ? err.message : "Could not load this profile.";
        }
      })
      .finally(() => {
        if (!cancelled) loading = false;
      });
    return () => {
      cancelled = true;
    };
  });

  const kindRows = $derived(
    profile
      ? CONTRIBUTION_KINDS.filter((kind) => profile!.breakdown[kind] > 0).map(
          (kind) => ({
            kind,
            label: KIND_LABELS[kind],
            count: profile!.breakdown[kind],
            points: profile!.breakdown[kind] * KIND_POINTS[kind],
          }),
        )
      : [],
  );

  const monthYear = new Intl.DateTimeFormat("en-PH", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Manila",
  });
  const shortDate = new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  });

  function safeHttpsUrl(value: string | null): string | null {
    if (!value) return null;
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? url.href : null;
    } catch {
      return null;
    }
  }

  const avatarSrc = $derived(safeHttpsUrl(profile?.avatarUrl ?? null));
  const profileHref = $derived(safeHttpsUrl(profile?.profileUrl ?? null));
  let avatarFailed = $state(false);
</script>

<section class="contributor-profile" aria-labelledby="contributor-profile-name">
  <div class="contributor-profile__bar">
    <button
      type="button"
      class="contributor-profile__back"
      aria-label="Back to leaderboard"
      onclick={onback}
    >
      <ArrowLeft size={24} aria-hidden="true" />
    </button>
    <span class="contributor-profile__bar-title">Contributor</span>
  </div>

  {#if loading}
    <p class="contributor-profile__status">
      <LoadingIndicator label="Loading profile…" />
    </p>
  {:else if error || !profile}
    <p class="contributor-profile__status">
      {error ?? "This contributor's profile is not public."}
    </p>
  {:else}
    <header class="contributor-profile__head">
      {#if avatarSrc && !avatarFailed}
        <img
          class="contributor-profile__photo"
          src={avatarSrc}
          alt=""
          width="64"
          height="64"
          referrerpolicy="no-referrer"
          onerror={() => (avatarFailed = true)}
        />
      {:else}
        <Avatar name={profile.displayName} colorKey={profile.key} size={64} />
      {/if}
      <div class="contributor-profile__identity">
        <h3 id="contributor-profile-name" class="contributor-profile__name">
          {profile.displayName || name}
        </h3>
        <p class="contributor-profile__meta">
          Joined {monthYear.format(new Date(profile.joinedAt))}
        </p>
        {#if profileHref}
          <a
            class="contributor-profile__link"
            href={profileHref}
            target="_blank"
            rel="noopener noreferrer nofollow">Website</a
          >
        {/if}
      </div>
    </header>

    <dl class="contributor-profile__stats">
      <div>
        <dt>Points</dt>
        <dd>{profile.points}</dd>
      </div>
      <div>
        <dt>Approved edits</dt>
        <dd>{profile.contributionCount}</dd>
      </div>
    </dl>

    <ul class="contributor-profile__badges" aria-label="Badges">
      {#each profile.badges as badge (badge.id)}
        <li class="contributor-profile__badge" class:earned={badge.earned}>
          {badge.label}
          <span class="visually-hidden"
            >{badge.earned ? "earned" : "not earned yet"}</span
          >
        </li>
      {/each}
    </ul>

    {#if kindRows.length > 0}
      <h4 class="contributor-profile__section">Points by type</h4>
      <ul class="contributor-profile__kinds">
        {#each kindRows as row (row.kind)}
          <li>
            <span class="contributor-profile__kind-label">{row.label}</span>
            <span class="contributor-profile__kind-count"
              >{row.count} × {KIND_POINTS[row.kind]}</span
            >
            <span class="contributor-profile__kind-points"
              >{pointsLabel(row.points)}</span
            >
          </li>
        {/each}
      </ul>
    {/if}

    {#if profile.recent.length > 0}
      <h4 class="contributor-profile__section">Recent edits</h4>
      <ul class="contributor-profile__recent">
        {#each profile.recent as item (item.id)}
          <li>
            {#if item.href}
              <a class="contributor-profile__recent-row" href={item.href}>
                <span class="contributor-profile__recent-copy">
                  <span class="contributor-profile__recent-title"
                    >{item.entityLabel}</span
                  >
                  <span class="contributor-profile__recent-meta"
                    >{KIND_LABELS[item.kind]}, {shortDate.format(
                      new Date(item.createdAt),
                    )}</span
                  >
                </span>
                <ChevronRight size={20} aria-hidden="true" />
              </a>
            {:else}
              <div class="contributor-profile__recent-row">
                <span class="contributor-profile__recent-copy">
                  <span class="contributor-profile__recent-title"
                    >{item.entityLabel}</span
                  >
                  <span class="contributor-profile__recent-meta"
                    >{KIND_LABELS[item.kind]}, {shortDate.format(
                      new Date(item.createdAt),
                    )}</span
                  >
                </span>
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</section>

<style>
  .contributor-profile {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .contributor-profile__bar {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    min-height: 3rem;
  }

  .contributor-profile__back {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    border-radius: 999px;
    color: var(--theme-text, hsl(0, 0%, 15%));
    cursor: pointer;
  }

  .contributor-profile__back:hover {
    background: var(--theme-surface-2, hsl(0, 0%, 94%));
  }

  .contributor-profile__back:focus-visible {
    outline: 2px solid var(--theme-accent-text, hsl(358, 76%, 27%));
    outline-offset: -2px;
  }

  .contributor-profile__bar-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--theme-text-2, hsl(0, 0%, 38%));
  }

  .contributor-profile__status {
    margin: 0;
    padding: 0 1rem;
    font-size: 0.875rem;
    color: var(--theme-text-2, hsl(0, 0%, 38%));
  }

  .contributor-profile__head {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0 1rem;
  }

  .contributor-profile__photo {
    flex-shrink: 0;
    width: 4rem;
    height: 4rem;
    border-radius: 999px;
    object-fit: cover;
  }

  .contributor-profile__identity {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .contributor-profile__name {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1.3;
    overflow-wrap: anywhere;
    color: var(--theme-text, hsl(0, 0%, 12%));
  }

  .contributor-profile__meta {
    margin: 0;
    font-size: 0.875rem;
    color: var(--theme-text-2, hsl(0, 0%, 38%));
  }

  .contributor-profile__link {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--theme-accent-text, hsl(358, 76%, 27%));
  }

  .contributor-profile__stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    margin: 0;
    padding: 0 1rem;
  }

  .contributor-profile__stats div {
    padding: 0.75rem;
    border-radius: 0.75rem;
    background: var(--theme-surface-2, hsl(0, 0%, 96%));
  }

  .contributor-profile__stats dt {
    font-size: 0.8125rem;
    color: var(--theme-text-2, hsl(0, 0%, 38%));
  }

  .contributor-profile__stats dd {
    margin: 0.125rem 0 0;
    font-size: 1.375rem;
    font-weight: 700;
    color: var(--theme-text, hsl(0, 0%, 12%));
  }

  .contributor-profile__badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 0;
    padding: 0 1rem;
    list-style: none;
  }

  .contributor-profile__badge {
    padding: 0.375rem 0.75rem;
    border-radius: 999px;
    border: 1px dashed var(--theme-border-strong, hsl(0, 0%, 70%));
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--theme-text-muted, hsl(0, 0%, 42%));
  }

  .contributor-profile__badge.earned {
    border: 1px solid transparent;
    background: var(--theme-accent-soft, hsl(358, 60%, 95%));
    color: var(--theme-accent-text, hsl(358, 76%, 27%));
  }

  .contributor-profile__section {
    margin: 0.5rem 0 0;
    padding: 0 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--theme-accent-text, hsl(358, 76%, 27%));
  }

  .contributor-profile__kinds,
  .contributor-profile__recent {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .contributor-profile__kinds li {
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: 0.75rem;
    min-height: 3rem;
    padding: 0 1rem;
    font-size: 0.9375rem;
    color: var(--theme-text, hsl(0, 0%, 15%));
  }

  .contributor-profile__kind-count {
    font-size: 0.8125rem;
    color: var(--theme-text-muted, hsl(0, 0%, 42%));
  }

  .contributor-profile__kind-points {
    font-weight: 600;
  }

  .contributor-profile__recent-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-height: 4.5rem;
    padding: 0 1rem;
    color: var(--theme-text, hsl(0, 0%, 15%));
    text-decoration: none;
  }

  a.contributor-profile__recent-row:hover {
    background: var(--theme-surface-2, hsl(0, 0%, 96%));
  }

  a.contributor-profile__recent-row:focus-visible {
    outline: 2px solid var(--theme-accent-text, hsl(358, 76%, 27%));
    outline-offset: -2px;
  }

  .contributor-profile__recent-copy {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .contributor-profile__recent-title {
    font-size: 1rem;
    overflow-wrap: anywhere;
  }

  .contributor-profile__recent-meta {
    font-size: 0.875rem;
    color: var(--theme-text-2, hsl(0, 0%, 38%));
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
</style>
