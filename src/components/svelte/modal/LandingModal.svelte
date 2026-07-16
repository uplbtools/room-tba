<script lang="ts">
  import { modalStore } from "@lib/store.svelte";
  import { designers } from "@constants/contributors";
  import {
    UPLB_TOOLS_URL,
    DISCORD_URL,
    MESSENGER_CONTRIBUTE_TARGET,
    MESSENGER_MAINTAIN_TARGET,
  } from "@constants/community-links";
  import CommunityPlatformLink from "@ui/community/CommunityPlatformLink.svelte";
  import {
    fetchGithubContributors,
    type GithubContributor,
  } from "@lib/github-contributors";
  import {
    fetchGithubStarCountCached,
  } from "@lib/github-stars";
  import PeopleAvatarGrid from "./PeopleAvatarGrid.svelte";
  import GithubContributorsSection from "./GithubContributorsSection.svelte";
  import LandingGuideSteps from "./LandingGuideSteps.svelte";
  import VisitorCounter from "@ui/VisitorCounter.svelte";
  import GithubStarLink from "@ui/GithubStarLink.svelte";
  import { GITHUB_ROOM_TBA_URL } from "@constants/community-links";
  import Download from "@lucide/svelte/icons/download";
  import { untrack } from "svelte";

  type LandingTab = "welcome" | "campus";

  let activeTab = $state<LandingTab>("welcome");
  let dontShowAgain = $state(false);
  let installPrompt = $state<
    | (Event & {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: string }>;
      })
    | null
  >(null);
  let isInstalled = $state(false);

  let githubContributors = $state<GithubContributor[]>([]);
  let githubLoading = $state(false);
  let githubError = $state<string | null>(null);
  let githubLoaded = $state(false);
  let githubRepoStars = $state<number | null>(null);
  type EditorCredit = {
    name: string;
    avatarUrl: string | null;
    profileUrl: string | null;
  };
  let campusCredits = $state<EditorCredit[]>([]);
  let creditsLoading = $state(false);
  let creditsLoaded = $state(false);

  const tabs: { id: LandingTab; label: string }[] = [
    { id: "welcome", label: "Welcome" },
    { id: "campus", label: "Campus team" },
  ];

  function toAvatarPeople(list: typeof contributors) {
    return list.map((person) => ({
      name: person.name,
      href: person.href,
      imageSrc: "",
    }));
  }

  const designerPeople = $derived(toAvatarPeople(designers));
  const campusCreditPeople = $derived(
    campusCredits.map((person) => ({
      name: person.name,
      href: person.profileUrl ?? undefined,
      imageSrc: person.avatarUrl ?? "/profile.svg",
    })),
  );

  async function loadCampusCredits() {
    if (creditsLoaded || creditsLoading) return;
    creditsLoading = true;
    try {
      const res = await fetch("/api/editor-credits");
      campusCredits = res.ok ? ((await res.json()) as EditorCredit[]) : [];
      creditsLoaded = true;
    } catch {
      campusCredits = [];
    } finally {
      creditsLoading = false;
    }
  }

  async function loadGithubData() {
    if (githubLoaded || githubLoading) return;
    githubLoading = true;
    githubError = null;
    try {
      const [contributorsRes, repoStarsRes] = await Promise.all([
        fetchGithubContributors(),
        fetchGithubStarCountCached(),
      ]);
      githubContributors = contributorsRes;
      githubRepoStars = repoStarsRes;
      githubLoaded = true;
    } catch (err) {
      githubError =
        err instanceof Error ? err.message : "Could not load GitHub data";
    } finally {
      githubLoading = false;
    }
  }

  function retryGithubData() {
    githubLoaded = false;
    void loadGithubData();
  }

  function selectTab(tab: LandingTab) {
    activeTab = tab;
    if (tab === "campus") {
      void loadGithubData();
      void loadCampusCredits();
    }
  }

  function handleGetStarted() {
    if (installPrompt) {
      void installPrompt.prompt();
      installPrompt.userChoice.then(({ outcome }) => {
        if (outcome === "accepted") isInstalled = true;
      });
      installPrompt = null;
      return;
    }
    if (dontShowAgain) {
      localStorage.setItem("hideLandingModal", "true");
    }
    modalStore.closeModal();
  }

  $effect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      installPrompt = e as BeforeInstallPromptEvent;
    };
    window.addEventListener("beforeinstallprompt", handler);
    const iosStandalone =
      "standalone" in window.navigator &&
      (window.navigator as unknown as { standalone: boolean }).standalone ===
        true;
    isInstalled =
      iosStandalone || window.matchMedia("(display-mode: standalone)").matches;
    return () => window.removeEventListener("beforeinstallprompt", handler);
  });

  $effect(() => {
    if (!modalStore.open) return;
    activeTab = untrack(() => modalStore.landingTab) ?? "welcome";
    if (untrack(() => activeTab) === "campus") {
      void loadGithubData();
      void loadCampusCredits();
    }
  });
</script>

<div class="landing-content">
  <header class="landing-header">
    <div class="hero-image">
      <div class="hero-overlay">
        <h2>
          <span class="hero-title" id="landing-modal-title">
            <img src="/logo.png" alt="" class="hero-logo" aria-hidden="true" />
            Room TBA
          </span>
        </h2>
        <p class="hero-tagline">
          Find rooms, explore the map, and discover campus events at UPLB.
        </p>
        <ul class="hero-pitches">
          <li>No account needed. Search and browse without signing in.</li>
          <li>
            Works offline. Campus data is saved to your device after the first
            visit.
          </li>
        </ul>
      </div>
    </div>

    <div class="tab-bar" role="tablist" aria-label="About Room TBA">
      {#each tabs as tab (tab.id)}
        <button
          type="button"
          role="tab"
          id="landing-tab-{tab.id}"
          class="tab-btn"
          class:active={activeTab === tab.id}
          aria-selected={activeTab === tab.id}
          aria-controls="landing-panel-{tab.id}"
          onclick={() => selectTab(tab.id)}
        >
          {tab.label}
        </button>
      {/each}
    </div>
  </header>

  <div class="scroll-region map-chrome-scroll">
    {#if activeTab === "welcome"}
      <div
        class="tab-panel"
        role="tabpanel"
        id="landing-panel-welcome"
        aria-labelledby="landing-tab-welcome"
      >
        <LandingGuideSteps />
      </div>
    {:else}
      <div
        class="tab-panel"
        role="tabpanel"
        id="landing-panel-campus"
        aria-labelledby="landing-tab-campus"
      >
        <section class="people-block">
          <h3>Campus editors &amp; contributors</h3>
          <p class="section-note">People credited for published campus data changes.</p>
          {#if creditsLoading}
            <p class="section-note">Loading credits…</p>
          {:else if campusCredits.length > 0}
            <PeopleAvatarGrid people={campusCreditPeople} />
          {:else if creditsLoaded}
            <p class="section-note">No public credits yet.</p>
          {/if}
        </section>

        <GithubContributorsSection
          title="Developers"
          note="From GitHub commit history on the Room TBA repo."
          contributors={githubContributors}
          loading={githubLoading}
          loaded={githubLoaded}
          error={githubError}
          onRetry={retryGithubData}
        />

        <div class="github-cta">
          <p class="cta-text">Like the project? Support us by starring the repository!</p>
          <a
            href="https://github.com/uplbtools/room-tba"
            target="_blank"
            rel="noopener noreferrer"
            class="cta-button"
          >
            <span class="cta-button__icon">★</span>
            <span class="cta-button__text">Star on GitHub</span>
            {#if githubRepoStars !== null}
              <span class="cta-button__count">{githubRepoStars.toLocaleString()}</span>
            {/if}
          </a>
        </div>

        <section class="community-block">
          <h3>Join the community</h3>
          <p class="section-note">
            Suggest fixes in the map, or chat on Discord or Messenger if you
            want to help verify data.
          </p>
          <ul class="community-links">
            <li>
              <a
                href={UPLB_TOOLS_URL}
                target="_blank"
                rel="noopener noreferrer"
                class="inline-link">UPLB Tools</a
              >
            </li>
            <li>
              <CommunityPlatformLink brand="discord" href={DISCORD_URL} label="Discord" />
            </li>
            <li>
              <CommunityPlatformLink
                brand="messenger"
                href={MESSENGER_CONTRIBUTE_TARGET}
                label="Messenger (contribute)"
              />
            </li>
            <li>
              <CommunityPlatformLink
                brand="messenger"
                href={MESSENGER_MAINTAIN_TARGET}
                label="Maintainer chat"
              />
            </li>
          </ul>
        </section>

        <section class="people-block">
          <h3>Design</h3>
          <p class="section-note">
            Visual and UX design (manual credits, not from GitHub commits).
          </p>
          <PeopleAvatarGrid
            people={designerPeople}
            imageFolder="contributors"
          />
        </section>

        <section class="inspiration-block">
          <h3>Inspiration &amp; similar tools</h3>
          <ul class="inspiration-links">
            <li>
              <a
                href="https://upsked.com/"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-link">Upsked.com</a
              >
              by John Paul Poliquit
            </li>
            <li>
              <a
                href="https://uplb-trail.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-link">UPLB Trail</a
              >
              by Bernard Jezua Tandang
            </li>
            <li>
              <a
                href="https://chromewebstore.google.com/detail/amissu/mkdgckblaojfigmbnknehcmnjpkcehcj"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-link">AMISSU</a
              >
              by Garth Hendrich Lapitan
            </li>
          </ul>
        </section>

      </div>
    {/if}
  </div>

  <footer class="actions">
    <div class="footer-meta">
      <VisitorCounter />
      <GithubStarLink />
    </div>
    <p class="legal-hint">
      <a href="/privacy" class="inline-link">Privacy</a>
      ·
      <a href="/terms" class="inline-link">Terms</a>
    </p>
    {#if installPrompt && !isInstalled}
      <button class="primary-btn install-btn" onclick={handleGetStarted}>
        <Download size={16} aria-hidden="true" />
        Install Room TBA
      </button>
    {:else}
      <button class="primary-btn" onclick={() => modalStore.closeModal()}
        >Get Started</button
      >
    {/if}
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

  .hero-pitches {
    list-style: none;
    margin: 0.375rem 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    max-width: 24rem;
    font-size: 0.75rem;
    font-weight: 600;
    line-height: 1.35;
    color: hsl(5, 35%, 92%);
  }

  .hero-pitches li {
    margin: 0;
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

  .inspiration-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.375rem;
    width: 100%;
  }

  .inspiration-block h3 {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 700;
    color: hsl(5, 53%, 28%);
  }

  .inspiration-links {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.25rem 0.75rem;
    margin: 0;
    padding: 0;
    font-size: 0.8125rem;
    color: hsl(0, 0%, 30%);
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

  .github-cta {
    margin: 1.25rem 0 0.5rem;
    padding: 1rem;
    background: hsl(0, 0%, 98%);
    border: 1px solid hsl(0, 0%, 90%);
    border-radius: 0.75rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.625rem;
    width: 100%;
    box-sizing: border-box;
  }

  .cta-text {
    margin: 0;
    font-size: 0.875rem;
    color: hsl(0, 0%, 25%);
    font-weight: 500;
  }

  .cta-button {
    display: inline-flex;
    align-items: center;
    background-color: #24292e;
    color: white;
    padding: 0.5rem 1.125rem;
    border-radius: 0.5rem;
    text-decoration: none;
    font-size: 0.9375rem;
    font-weight: 600;
    transition: background-color 0.2s ease;
  }

  .cta-button:hover {
    background-color: hsl(0, 0%, 12%);
  }

  .cta-button:active {
    background-color: hsl(0, 0%, 18%);
  }

  .cta-button__icon {
    margin-right: 0.5rem;
    font-size: 1.1em;
  }

  .cta-button__count {
    margin-left: 0.625rem;
    padding-left: 0.625rem;
    border-left: 1px solid rgba(255, 255, 255, 0.3);
    font-weight: 700;
  }

  .community-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.375rem;
    width: 100%;
  }

  .community-block h3 {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 700;
    color: hsl(5, 53%, 28%);
  }

  .community-links {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.375rem 0.75rem;
    font-size: 0.8125rem;
  }

  .footer-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: stretch;
    justify-content: center;
    gap: 0.625rem;
    width: 100%;
    padding: 0.125rem 0 0.25rem;
  }

  .legal-hint {
    margin: 0;
    font-size: 0.75rem;
    color: hsl(0, 0%, 38%);
  }

  .actions {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.625rem;
    padding: 0.875rem 1rem 1rem;
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

  .install-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background-color: hsl(5, 75%, 28%);
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
