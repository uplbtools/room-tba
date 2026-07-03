<script lang="ts">
  import CommunityBrandIcon from "./CommunityBrandIcon.svelte";

  type Brand = "discord" | "messenger";

  type Props = {
    brand: Brand;
    href: string;
    label: string;
    class?: string;
  };

  const { brand, href, label, class: className = "" }: Props = $props();
</script>

<a
  {href}
  class={`community-platform-link ${className}`.trim()}
  target="_blank"
  rel="noopener noreferrer"
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
