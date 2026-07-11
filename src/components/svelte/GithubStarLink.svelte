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
</script>

<a
  class="github-star-link"
  href={GITHUB_ROOM_TBA_URL}
  target="_blank"
  rel="noopener noreferrer"
  aria-label={label}
>
  <Star size={14} aria-hidden="true" class="github-star-link__icon" />
  <span>Star on GitHub</span>
  {#if stars !== null}
    <span class="github-star-link__count" aria-hidden="true">
      · {stars.toLocaleString()}
    </span>
  {:else if !failed}
    <span class="github-star-link__count github-star-link__count--loading" aria-hidden="true">
      · …
    </span>
  {/if}
</a>

<style>
  .github-star-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    margin: 0;
    font-size: 0.75rem;
    color: hsl(0, 0%, 42%);
    text-decoration: none;
  }

  .github-star-link:hover {
    color: hsl(5, 53%, 32%);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .github-star-link :global(.github-star-link__icon) {
    color: hsl(45, 90%, 42%);
    flex-shrink: 0;
  }

  .github-star-link__count {
    color: hsl(0, 0%, 50%);
    font-variant-numeric: tabular-nums;
  }

  .github-star-link__count--loading {
    opacity: 0.6;
  }
</style>
