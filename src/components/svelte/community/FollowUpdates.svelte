<script lang="ts">
  import { FACEBOOK_URL, INSTAGRAM_URL } from "@constants/community-links";
  import CommunityPlatformLink from "./CommunityPlatformLink.svelte";

  type Props = {
    /** What following actually gets them, in this surface's own words. */
    note: string;
    /** Called when either account is opened. */
    onfollow?: () => void;
  };

  const { note, onfollow }: Props = $props();
</script>

<p class="follow-updates__note">{note}</p>
<ul class="follow-updates__links">
  <li>
    <CommunityPlatformLink
      brand="facebook"
      href={FACEBOOK_URL}
      label="UPLB Tools on Facebook"
      onclick={onfollow}
    />
  </li>
  <li>
    <CommunityPlatformLink
      brand="instagram"
      href={INSTAGRAM_URL}
      label="UPLB Tools on Instagram"
      onclick={onfollow}
    />
  </li>
</ul>

<style>
  .follow-updates__note {
    margin: 0;
    font-size: 0.8125rem;
    line-height: 1.5;
    color: hsl(0, 0%, 28%);
    text-wrap: pretty;
  }

  .follow-updates__links {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    /* Column gap only: the 44px rows already carry the vertical rhythm. */
    gap: 0 1rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  /* Inline brand links are text-sized by default; the touch target is not. */
  .follow-updates__links :global(.community-platform-link) {
    display: inline-flex;
    align-items: center;
    min-height: 2.75rem;
    font-size: 0.8125rem;
  }

  @media (prefers-color-scheme: dark) {
    .follow-updates__note {
      color: hsl(0, 0%, 72%);
    }

    .follow-updates__links :global(.community-platform-link) {
      color: hsl(5, 65%, 76%);
    }
  }
</style>
