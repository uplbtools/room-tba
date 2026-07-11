<script lang="ts">
  import Star from "@lucide/svelte/icons/star";
  import { GITHUB_ROOM_TBA_URL } from "@constants/community-links";
  import { fetchGithubStarCountCached } from "@lib/github-stars";

  let stars = $state<number | null>(null);
  let failed = $state(false);

  $effect(() => {
    let active = true;
    fetchGithubStarCountCached()
      .then((value) => {
        if (active) stars = value;
      })
      .catch(() => {
        if (active) failed = true;
      });
    return () => {
      active = false;
    };
  });

  const label = $derived(
    stars !== null
      ? `Star Room TBA on GitHub (${stars.toLocaleString()} stars)`
      : "Star Room TBA on GitHub",
  );

  const displayCount = $derived(
    stars !== null ? stars.toLocaleString() : failed ? "—" : "…",
  );
</script>

<a
  class="github-star-link"
  href={GITHUB_ROOM_TBA_URL}
  target="_blank"
  rel="noopener noreferrer"
  aria-label={label}
>
  <Star size={16} aria-hidden="true" class="github-star-link__icon" />
  <span class="github-star-link__copy">
    <span class="github-star-link__count" aria-hidden="true">{displayCount}</span>
    <span class="github-star-link__label">GitHub stars</span>
  </span>
</a>

<style>
  .github-star-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    padding: 0.5rem 0.875rem;
    border-radius: 999px;
    background: hsl(5, 32%, 95%);
    border: 1px solid hsl(5, 28%, 78%);
    color: hsl(5, 58%, 22%);
    text-decoration: none;
    box-shadow: 0 1px 2px hsla(5, 40%, 20%, 0.06);
    transition:
      background-color 0.15s ease,
      border-color 0.15s ease,
      box-shadow 0.15s ease;
  }

  .github-star-link:hover {
    background: hsl(5, 38%, 92%);
    border-color: hsl(5, 45%, 62%);
    box-shadow: 0 2px 6px hsla(5, 40%, 20%, 0.1);
  }

  .github-star-link:focus-visible {
    outline: 2px solid hsl(5, 65%, 32%);
    outline-offset: 2px;
  }

  .github-star-link :global(.github-star-link__icon) {
    flex-shrink: 0;
    color: hsl(42, 92%, 38%);
    fill: hsl(42, 92%, 38%);
  }

  .github-star-link__copy {
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.0625rem;
    min-width: 0;
  }

  .github-star-link__count {
    font-size: 1rem;
    font-weight: 800;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
    color: hsl(5, 70%, 20%);
  }

  .github-star-link__label {
    font-size: 0.75rem;
    font-weight: 700;
    line-height: 1.2;
    color: hsl(5, 45%, 30%);
    white-space: nowrap;
  }
</style>
