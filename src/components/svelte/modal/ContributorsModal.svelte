<script lang="ts">
  import { onMount } from "svelte";
  import { designers } from "@constants/contributors";
  import {
    UPLB_TOOLS_URL,
    DISCORD_URL,
    MESSENGER_CONTRIBUTE_TARGET,
    MESSENGER_MAINTAIN_TARGET,
    GITHUB_ROOM_TBA_URL,
  } from "@constants/community-links";
  import CommunityPlatformLink from "@ui/community/CommunityPlatformLink.svelte";
  import {
    fetchGithubContributors,
    type GithubContributor,
  } from "@lib/github-contributors";
  import ModalHeader from "./ModalHeader.svelte";
  import PeopleAvatarGrid from "./PeopleAvatarGrid.svelte";
  import GithubContributorsSection from "./GithubContributorsSection.svelte";
  import "../map-chrome/map-chrome.css";

  /**
   * The people behind Room TBA, as its own screen: campus editors credited
   * for published data, developers from GitHub, designers, and where to
   * join in. It used to be a tab of the welcome tour, so "Contributors"
   * opened the tour.
   */
  /** Similar campus map initiatives (#108). */
  const SIMILAR_MAPS = [
    {
      label: "Malayo Ba 'Yan?",
      href: "https://umap.openstreetmap.fr/en/map/ati-ntc-rh-malayo-ba-yan-maps-and-directions_1245231",
    },
    {
      label: "UPLB Lower Campus",
      href: "https://umap.openstreetmap.fr/en/map/uplb-lower-campus_1180826",
    },
    {
      label: "UPLB ScribbleMaps",
      href: "https://www.scribblemaps.com/maps/view/UPLB-Map/8fmzCgyQ4y",
    },
  ];

  type EditorCredit = {
    name: string;
    avatarUrl: string | null;
    profileUrl: string | null;
  };

  let githubContributors = $state<GithubContributor[]>([]);
  let githubLoading = $state(false);
  let githubError = $state<string | null>(null);
  let githubLoaded = $state(false);
  let campusCredits = $state<EditorCredit[]>([]);
  let creditsLoading = $state(false);
  let creditsLoaded = $state(false);

  const designerPeople = designers.map((person) => ({
    name: person.name,
    href: person.href,
    imageSrc: "",
  }));
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
      githubContributors = await fetchGithubContributors();
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

  onMount(() => {
    void loadGithubData();
    void loadCampusCredits();
  });
</script>

<div class="contributors">
  <ModalHeader
    id="contributors-modal-title"
    title="Contributors"
    description="The people who map, build, and design Room TBA."
  />
  <div class="contributors__scroll map-chrome-scroll">
    <section class="people-block">
      <h3>Campus editors and contributors</h3>
      <p class="section-note">
        People credited for published campus data changes.
      </p>
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

    <section class="people-block">
      <h3>Design</h3>
      <p class="section-note">
        Visual and UX design (manual credits, not from GitHub commits).
      </p>
      <PeopleAvatarGrid people={designerPeople} imageFolder="contributors" />
    </section>

    <section class="people-block">
      <h3>Join in</h3>
      <p class="section-note">
        Suggest fixes on the map, send code on GitHub, or chat on Discord or
        Messenger if you want to help verify data.
      </p>
      <ul class="link-list">
        <li>
          <a
            href={GITHUB_ROOM_TBA_URL}
            target="_blank"
            rel="noopener noreferrer"
            class="inline-link">Room TBA on GitHub</a
          >
        </li>
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
      <h3>Inspiration and similar tools</h3>
      <ul class="link-list">
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
        {#each SIMILAR_MAPS as item (item.href)}
          <li>
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              class="inline-link">{item.label}</a
            >
          </li>
        {/each}
      </ul>
    </section>
  </div>
</div>

<style>
  .contributors {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
  }

  .contributors__scroll {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 1.25rem;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 0.5rem 1rem 1rem;
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
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--theme-accent-text, hsl(345, 75%, 31%));
  }

  .section-note {
    margin: 0;
    max-width: 28rem;
    font-size: 0.875rem;
    line-height: 1.45;
    text-align: center;
    color: var(--theme-text-2, hsl(0, 0%, 35%));
  }

  .link-list {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.375rem 1rem;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 0.875rem;
    color: var(--theme-text, hsl(0, 0%, 30%));
    text-align: center;
  }

  .link-list li {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    min-height: 2.75rem;
  }

  .inline-link {
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
    font-weight: 600;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
</style>
