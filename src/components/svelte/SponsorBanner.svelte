<script lang="ts">
  import X from "@lucide/svelte/icons/x";
  import { onMount } from "svelte";
  import {
    getByTier,
    loadSponsors,
    rotateSponsor,
    type Sponsor,
  } from "@lib/sponsors";
  import {
    trackSponsorClick,
    trackSponsorImpression,
  } from "@lib/sponsor-tracking";

  const DISMISS_KEY = "rtba-sponsor-dismissed";

  let sponsor = $state<Sponsor | null>(null);
  let dismissed = $state(false);
  let bannerEl = $state<HTMLElement | null>(null);

  onMount(async () => {
    try {
      dismissed = sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      // sessionStorage unavailable — show the banner, skip dismissal memory.
    }
    if (dismissed) return;
    const data = await loadSponsors();
    if (!data) return;
    // Gold + Silver pool, rotated daily so multiple sponsors share the slot.
    sponsor = rotateSponsor([
      ...getByTier(data.sponsors, "gold"),
      ...getByTier(data.sponsors, "silver"),
    ]);
  });

  // Impression counts only once the banner is at least half visible.
  $effect(() => {
    if (!bannerEl || !sponsor) return;
    const sponsorId = sponsor.id;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.intersectionRatio >= 0.5)) {
          trackSponsorImpression(sponsorId, "side_panel");
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(bannerEl);
    return () => observer.disconnect();
  });

  function dismiss() {
    dismissed = true;
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Best effort — dismissal just won't survive a reload.
    }
  }
</script>

{#if sponsor && !dismissed}
  <aside class="sponsor-banner" bind:this={bannerEl}>
    <span class="sponsor-banner__label">Sponsored</span>
    <button
      type="button"
      class="sponsor-banner__dismiss"
      aria-label="Dismiss sponsor message"
      onclick={dismiss}
    >
      <X size={14} aria-hidden="true" />
    </button>
    <a
      class="sponsor-banner__link"
      href={sponsor.url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      aria-label={`Visit ${sponsor.name}, sponsor`}
      onclick={() => sponsor && trackSponsorClick(sponsor.id, "side_panel")}
    >
      {#if sponsor.banner}
        <img
          class="sponsor-banner__image"
          src={sponsor.banner}
          alt={sponsor.name}
          width="300"
          height="80"
          loading="lazy"
        />
      {/if}
      <span class="sponsor-banner__name">{sponsor.name}</span>
      {#if sponsor.tagline}
        <span class="sponsor-banner__tagline">{sponsor.tagline}</span>
      {/if}
    </a>
  </aside>
{/if}

<style>
  .sponsor-banner {
    position: relative;
    margin: 0.75rem 0 0;
    padding: 0.625rem 0.75rem;
    border-radius: 0.75rem;
    border: 1px solid hsl(5 30% 88%);
    background: var(--map-chrome-surface, #fffafa);
  }

  .sponsor-banner__label {
    display: block;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.625rem;
    font-weight: 700;
    color: hsl(0, 0%, 52%);
    margin-bottom: 0.375rem;
  }

  .sponsor-banner__dismiss {
    position: absolute;
    top: 0.375rem;
    right: 0.375rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: hsl(0, 0%, 45%);
    cursor: pointer;
  }

  .sponsor-banner__dismiss:hover,
  .sponsor-banner__dismiss:focus-visible {
    background: hsl(5 30% 92%);
    color: hsl(0, 0%, 20%);
  }

  .sponsor-banner__link {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    text-decoration: none;
    color: inherit;
    min-width: 0;
  }

  .sponsor-banner__image {
    max-width: 100%;
    width: auto;
    height: auto;
    max-height: 5rem;
    object-fit: contain;
    border-radius: 0.5rem;
  }

  .sponsor-banner__name {
    font-size: 0.8125rem;
    font-weight: 700;
    color: hsl(5, 53%, 32%);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .sponsor-banner__tagline {
    font-size: 0.75rem;
    color: hsl(0, 0%, 38%);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .sponsor-banner__link:hover .sponsor-banner__name,
  .sponsor-banner__link:focus-visible .sponsor-banner__name {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
</style>
