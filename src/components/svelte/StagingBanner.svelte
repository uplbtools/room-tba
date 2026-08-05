<script lang="ts">
  import { isStagingApp } from "@lib/app-env";
  import { observeBlockHeight } from "@lib/layout-css-vars";

  let bannerEl = $state<HTMLElement | null>(null);
  const visible = $derived(isStagingApp());

  $effect(() => {
    const layout = document.querySelector(".app-layout") as HTMLElement | null;
    // The gap only exists to separate chrome from the strip, so it belongs to
    // the strip. Left standing at 0.5rem it becomes dead space above the top
    // bar everywhere the banner does not render, which is all of production.
    layout?.style.setProperty(
      "--staging-banner-gap",
      visible ? "0.5rem" : "0px",
    );
    if (!visible) {
      layout?.style.setProperty("--staging-banner-height", "0px");
      return;
    }
    if (!bannerEl) return;
    return observeBlockHeight(bannerEl, "--staging-banner-height", {
      shouldSkip: () => !isStagingApp(),
      skipValue: "0px",
      // Ceil so fractional device pixels cannot leave search under the strip.
      onSync: (heightPx, root) => {
        const n = Number.parseFloat(heightPx);
        if (!Number.isFinite(n)) return;
        root.style.setProperty(
          "--staging-banner-height",
          `${Math.ceil(n)}px`,
        );
      },
    });
  });
</script>

{#if visible}
  <div
    bind:this={bannerEl}
    class="staging-banner"
    role="status"
    aria-live="polite"
  >
    <p class="staging-banner__title">
      Staging — changes here are not on production
    </p>
    <p class="staging-banner__sub">
      Edits, contributor sign-ups, and proposals on staging stay in the staging
      database until released to prod via the normal ship pipeline.
    </p>
  </div>
{/if}

<style>
  .staging-banner {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: var(--z-staging-banner, 20);
    box-sizing: border-box;
    padding: 0.5rem 0.75rem;
    padding-top: calc(0.5rem + env(safe-area-inset-top, 0px));
    background: hsl(38 92% 94%);
    color: hsl(24 62% 18%);
    border-bottom: 2px solid hsl(32 78% 42%);
    text-align: center;
  }

  .staging-banner__title {
    margin: 0;
    font-size: 0.8125rem;
    font-weight: 700;
    line-height: 1.3;
  }

  .staging-banner__sub {
    margin: 0.25rem 0 0;
    font-size: 0.6875rem;
    font-weight: 500;
    line-height: 1.35;
    color: hsl(24 45% 28%);
  }

  @media (max-width: 48rem) {
    .staging-banner {
      text-align: left;
    }

    .staging-banner__sub {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
    }
  }
</style>
