<script lang="ts">
  import { onMount } from "svelte";
  import { modalStore } from "../../../lib/store.svelte";
  import { contributors } from "../../../constants/contributors";
  import {
    fetchGithubContributors,
    type GithubContributor,
  } from "../../../lib/github-contributors";
  import PeopleAvatarGrid from "./PeopleAvatarGrid.svelte";
  import GithubContributorsSection from "./GithubContributorsSection.svelte";
  import LandingGuideSteps from "./LandingGuideSteps.svelte";

  type LandingTab = "welcome" | "campus";

  let activeTab = $state<LandingTab>("welcome");
  let dontShowAgain = $state(false);

  let githubContributors = $state<GithubContributor[]>([]);
  let githubLoading = $state(false);
  let githubError = $state<string | null>(null);
  let githubLoaded = $state(false);

  const tabs: { id: LandingTab; label: string }[] = [
    { id: "welcome", label: "Welcome" },
    { id: "campus", label: "Campus team" },
  ];

  const campusContributorPeople = $derived(
    contributors.map((person) => ({
      name: person.name,
      href: person.href,
      imageSrc: "",
    })),
  );

  async function loadGithubContributors() {
    if (githubLoaded || githubLoading) return;
    githubLoading = true;
    githubError = null;
    try {
      githubContributors = await fetchGithubContributors();
      githubLoaded = true;
    } catch (err) {
      githubError =
        err instanceof Error ? err.message : "Could not load contributors";
    } finally {
      githubLoading = false;
    }
  }

  function retryGithubContributors() {
    githubLoaded = false;
    void loadGithubContributors();
  }

  function selectTab(tab: LandingTab) {
    activeTab = tab;
    if (tab === "campus") void loadGithubContributors();
  }

  function handleGetStarted() {
    if (dontShowAgain) {
      localStorage.setItem("hideLandingModal", "true");
    }
    modalStore.closeModal();
  }

  onMount(() => {
    void loadGithubContributors();
  });
</script>

<div class="landing-content">
  <header class="landing-header">
    <div class="hero-image">
      <div class="hero-overlay">
        <h2>
          <span class="hero-title">
            <img src="/logo.png" alt="Room TBA logo" class="hero-logo" />
            Room TBA
          </span>
        </h2>
        <p class="hero-tagline">
          Find rooms, explore the map, and discover campus events at UPLB.
        </p>
      </div>
    </div>

    <div class="tab-bar" role="tablist" aria-label="About Room TBA">
      {#each tabs as tab (tab.id)}
        <button
          type="button"
          role="tab"
          class="tab-btn"
          class:active={activeTab === tab.id}
          aria-selected={activeTab === tab.id}
          onclick={() => selectTab(tab.id)}
        >
          {tab.label}
        </button>
      {/each}
    </div>
  </header>

  <div class="scroll-region">
    {#if activeTab === "welcome"}
      <div class="tab-panel" role="tabpanel">
        <LandingGuideSteps />
      </div>
    {:else}
      <div class="tab-panel" role="tabpanel">
        <GithubContributorsSection
          title="Developers"
          note="Pulled live from the Room TBA GitHub repo, sorted by commit count."
          contributors={githubContributors}
          loading={githubLoading}
          loaded={githubLoaded}
          error={githubError}
          onRetry={retryGithubContributors}
        />

        <p class="repo-link">
          <a
            href="https://github.com/smmariquit/room-tba"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-link">View repo on GitHub</a
          >
        </p>

        <section class="people-block">
          <h3>Campus editors &amp; contributors</h3>
          <p class="section-note">
            Students who help keep map data and events accurate on the ground.
            These credits are manual, not from GitHub commits.
          </p>
          <PeopleAvatarGrid
            people={campusContributorPeople}
            imageFolder="contributors"
          />
        </section>
      </div>
    {/if}
  </div>

  <footer class="actions">
    <button class="primary-btn" onclick={handleGetStarted}>Get Started</button>
    <label class="checkbox-label">
      <input type="checkbox" bind:checked={dontShowAgain} />
      Don't show again
    </label>
  </footer>
</div>

<style>
  .landing-content {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex: 1;
    min-height: 0;
    width: 100%;
    border-radius: inherit;
    background-color: white;
  }

  .landing-header {
    flex-shrink: 0;
  }

  .hero-image {
    background-image: url("/uplb-bg.webp");
    background-size: cover;
    background-position: center;
    display: flex;
  }

  .hero-overlay {
    background-color: rgba(123, 17, 19, 0.85);
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    gap: 0.25rem;
    color: white;
    padding: 0.875rem 1rem;
    min-height: clamp(4.75rem, 11vh, 6.5rem);
  }

  .hero-overlay h2 {
    font-size: clamp(1.5rem, 4vw, 1.875rem);
    font-weight: 600;
    margin: 0;
    color: white;
    font-family: "Raleway", sans-serif;
    line-height: 1;
  }

  .hero-title {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .hero-logo {
    width: clamp(2.25rem, 6vw, 2.75rem);
    height: clamp(2.25rem, 6vw, 2.75rem);
    object-fit: contain;
  }

  .hero-tagline {
    font-size: 0.8125rem;
    margin: 0;
    font-weight: 500;
    max-width: 24rem;
    line-height: 1.35;
  }

  .tab-bar {
    display: flex;
    gap: 0.25rem;
    padding: 0.5rem 0.875rem 0;
    border-bottom: 1px solid hsl(0, 0%, 90%);
    background: hsl(0, 0%, 99%);
  }

  .tab-btn {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    color: hsl(0, 0%, 32%);
    font-size: 0.8125rem;
    font-weight: 600;
    padding: 0.45rem 0.5rem;
    border-radius: 0.5rem 0.5rem 0 0;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tab-btn.active {
    color: hsl(5, 53%, 28%);
    background: white;
    border-bottom-color: hsl(5, 53%, 35%);
  }

  .tab-btn:focus-visible {
    outline: 2px solid hsl(5, 53%, 35%);
    outline-offset: 1px;
  }

  .scroll-region {
    flex: 1;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    padding: 0.875rem 1rem 0.5rem;
  }

  .tab-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    max-width: 36rem;
    margin: 0 auto;
  }

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

  .inline-link {
    color: hsl(5, 53%, 32%);
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .repo-link {
    margin: 0;
    font-size: 0.8125rem;
  }

  .actions {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem 1rem;
    border-top: 1px solid hsl(0, 0%, 92%);
    background: white;
    width: 100%;
    box-sizing: border-box;
  }

  .primary-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    border-radius: 0.5rem;
    padding: 0.6875rem 1.75rem;
    font-size: 0.9375rem;
    font-weight: 700;
    cursor: pointer;
    background-color: hsl(5, 75%, 28%);
    color: white;
    border: none;
    box-shadow: 0 2px 4px rgba(123, 17, 19, 0.2);
    width: min(100%, 16rem);
    box-sizing: border-box;
  }

  .primary-btn:hover {
    background-color: hsl(5, 75%, 22%);
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
    color: hsl(0, 0%, 22%);
    cursor: pointer;
    user-select: none;
  }

  .checkbox-label input[type="checkbox"] {
    cursor: pointer;
    width: 1rem;
    height: 1rem;
    accent-color: hsl(5, 75%, 28%);
  }

  @media screen and (max-width: 48rem) {
    .scroll-region {
      padding: 0.75rem 0.875rem 0.375rem;
    }

    .actions {
      padding: 0.625rem 0.875rem 0.875rem;
    }
  }
</style>
