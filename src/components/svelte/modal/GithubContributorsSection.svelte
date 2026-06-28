<script lang="ts">
  import PeopleAvatarGrid from "./PeopleAvatarGrid.svelte";
  import type { GithubContributor } from "@lib/github-contributors";
  import { formatGithubContributions } from "@lib/github-contributors";

  type Props = {
    title: string;
    note: string;
    contributors: GithubContributor[];
    loading: boolean;
    loaded: boolean;
    error: string | null;
    onRetry: () => void;
  };

  const { title, note, contributors, loading, loaded, error, onRetry }: Props =
    $props();

  const people = $derived(
    contributors.map((person) => ({
      name: person.name ?? person.login,
      href: person.profileHref,
      imageSrc: person.avatarUrl,
      login: person.login,
      subtitle: formatGithubContributions(person.contributions),
    })),
  );
</script>

<section class="people-block">
  <h3>{title}</h3>
  <p class="section-note">{note}</p>

  {#if loading && !loaded}
    <p class="status-line" aria-live="polite">Loading from GitHub...</p>
    <div class="people-grid-skeleton" aria-hidden="true">
      {#each Array(6) as _, index (index)}
        <div class="skeleton-card"></div>
      {/each}
    </div>
  {:else if error}
    <p class="status-line error">{error}</p>
    <button type="button" class="secondary-btn" onclick={onRetry}>
      Try again
    </button>
  {:else if people.length === 0}
    <p class="status-line">No public contributors found yet.</p>
  {:else}
    <PeopleAvatarGrid {people} showGithubMeta />
  {/if}
</section>

<style>
  .people-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
  }

  .people-block h3 {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 700;
    color: hsl(5, 53%, 28%);
  }

  .section-note {
    margin: 0;
    font-size: 0.75rem;
    line-height: 1.45;
    color: hsl(0, 0%, 30%);
    max-width: 28rem;
    text-align: center;
  }

  .status-line {
    margin: 0;
    font-size: 0.8125rem;
    color: hsl(0, 0%, 30%);
  }

  .status-line.error {
    color: hsl(0, 65%, 32%);
  }

  .people-grid-skeleton {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(6.5rem, 1fr));
    gap: 0.75rem;
    width: 100%;
    max-width: 36rem;
  }

  .skeleton-card {
    height: 5.5rem;
    border-radius: 0.5rem;
    background: hsl(0, 0%, 92%);
  }

  .secondary-btn {
    border-radius: 0.5rem;
    padding: 0.625rem 1rem;
    font-size: 0.875rem;
    font-weight: 700;
    cursor: pointer;
    background: white;
    color: hsl(5, 53%, 28%);
    border: 1px solid hsl(5, 35%, 80%);
  }
</style>
