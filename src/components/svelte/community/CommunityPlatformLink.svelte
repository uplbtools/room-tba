<script lang="ts">
  import CommunityBrandIcon from "./CommunityBrandIcon.svelte";
  import type { CommunityBrand } from "./brands";

  type Props = {
    brand: CommunityBrand;
    href: string;
    label: string;
    class?: string;
    /** Fired before the new tab opens. Used to retire the follow prompt. */
    onclick?: () => void;
  };

  const {
    brand,
    href,
    label,
    class: className = "",
    onclick,
  }: Props = $props();
</script>

<a
  {href}
  class={`community-platform-link ${className}`.trim()}
  target="_blank"
  rel="noopener noreferrer"
  {onclick}
>
  <CommunityBrandIcon {brand} size={16} />
  <span>{label}</span>
</a>

<style>
  .community-platform-link {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    color: hsl(5, 53%, 32%);
    font-weight: 600;
    text-decoration: none;
  }

  .community-platform-link:hover,
  .community-platform-link:focus-visible {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
</style>
