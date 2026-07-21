<script lang="ts">
  import { onMount } from "svelte";
  import type { Sponsor } from "@lib/sponsors";
  import {
    trackSponsorClick,
    trackSponsorImpression,
  } from "@lib/sponsor-tracking";

  const { sponsor }: { sponsor: Sponsor } = $props();

  onMount(() => {
    trackSponsorImpression(sponsor.id, "status_bar");
  });
</script>

<a
  class="sponsor-badge"
  href={sponsor.url}
  target="_blank"
  rel="noopener noreferrer sponsored"
  aria-label={`Visit ${sponsor.name}, sponsor`}
  onclick={() => trackSponsorClick(sponsor.id, "status_bar")}
>
  Supported by <span class="sponsor-badge__name">{sponsor.name}</span>
</a>

<style>
  .sponsor-badge {
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: 0.6875rem;
    font-weight: 600;
    line-height: 1.15;
    color: hsl(0, 0%, 45%);
    text-decoration: none;
  }

  .sponsor-badge__name {
    color: hsl(5, 53%, 32%);
    font-weight: 700;
  }

  .sponsor-badge:hover,
  .sponsor-badge:focus-visible {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
</style>
