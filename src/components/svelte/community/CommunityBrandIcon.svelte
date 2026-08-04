<script lang="ts">
  import type { CommunityBrand } from "./brands";

  type Props = {
    brand: CommunityBrand;
    size?: number;
  };

  const { brand, size = 16 }: Props = $props();

  const uid = Math.random().toString(36).slice(2, 9);
  const gradientId = `messenger-gradient-${uid}`;
  const instagramGradientId = `instagram-gradient-${uid}`;
</script>

{#if brand === "facebook"}
  <!-- Facebook "f" mark: brand blue disc, white glyph. -->
  <svg
    class="community-brand-icon"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="12" cy="12" r="12" fill="#1877F2" />
    <path
      fill="#FFF"
      d="M16.671 15.47 17.203 12h-3.328V9.75c0-.949.465-1.874 1.956-1.874h1.513V4.922s-1.374-.235-2.687-.235c-2.741 0-4.532 1.662-4.532 4.669V12H7.078v3.47h3.047v8.385a12.13 12.13 0 0 0 3.75 0V15.47h2.796z"
    />
  </svg>
{:else if brand === "instagram"}
  <!-- Instagram camera mark on the official corner-anchored gradient. -->
  <svg
    class="community-brand-icon"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <radialGradient id={instagramGradientId} cx="0.3" cy="1.05" r="1.25">
      <stop offset="0" stop-color="#FFDD55" />
      <stop offset=".1" stop-color="#FFDD55" />
      <stop offset=".5" stop-color="#FF543E" />
      <stop offset="1" stop-color="#C837AB" />
    </radialGradient>
    <rect
      width="24"
      height="24"
      rx="6"
      fill={`url(#${instagramGradientId})`}
    />
    <rect
      x="5.2"
      y="5.2"
      width="13.6"
      height="13.6"
      rx="4.2"
      fill="none"
      stroke="#FFF"
      stroke-width="1.7"
    />
    <circle
      cx="12"
      cy="12"
      r="3.2"
      fill="none"
      stroke="#FFF"
      stroke-width="1.7"
    />
    <circle cx="16.35" cy="7.7" r="1.15" fill="#FFF" />
  </svg>
{:else if brand === "discord"}
  <svg
    class="community-brand-icon"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path
      fill="#5865F2"
      d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026 13.83 13.83 0 0 0 1.226-1.963.074.074 0 0 0-.041-.104 13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.246.195.373.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z"
    />
  </svg>
{:else}
  <!-- Official Meta Messenger logo (2020 redesign): radial gradient bubble + bolt. -->
  <svg
    class="community-brand-icon"
    width={size}
    height={size}
    viewBox="0 0 800 800"
    aria-hidden="true"
    focusable="false"
  >
    <radialGradient
      id={gradientId}
      cx="101.9"
      cy="809"
      r="1.1"
      gradientTransform="matrix(800 0 0 -800 -81386 648000)"
      gradientUnits="userSpaceOnUse"
    >
      <stop offset="0" style="stop-color:#09f" />
      <stop offset=".6" style="stop-color:#a033ff" />
      <stop offset=".9" style="stop-color:#ff5280" />
      <stop offset="1" style="stop-color:#ff7061" />
    </radialGradient>
    <path
      fill={`url(#${gradientId})`}
      d="M400 0C174.7 0 0 165.1 0 388c0 116.6 47.8 217.4 125.6 287 6.5 5.8 10.5 14 10.7 22.8l2.2 71.2a32 32 0 0 0 44.9 28.3l79.4-35c6.7-3 14.3-3.5 21.4-1.6 36.5 10 75.3 15.4 115.8 15.4 225.3 0 400-165.1 400-388S625.3 0 400 0z"
    />
    <path
      fill="#FFF"
      d="m159.8 501.5 117.5-186.4a60 60 0 0 1 86.8-16l93.5 70.1a24 24 0 0 0 28.9-.1l126.2-95.8c16.8-12.8 38.8 7.4 27.6 25.3L522.7 484.9a60 60 0 0 1-86.8 16l-93.5-70.1a24 24 0 0 0-28.9.1l-126.2 95.8c-16.8 12.8-38.8-7.3-27.5-25.2z"
    />
  </svg>
{/if}

<style>
  .community-brand-icon {
    display: block;
    flex-shrink: 0;
  }
</style>
