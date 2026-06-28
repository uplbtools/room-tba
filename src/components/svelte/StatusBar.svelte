<script lang="ts">
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import GitFork from "@lucide/svelte/icons/git-fork";
  import MessageCircle from "@lucide/svelte/icons/message-circle";
  import { slide } from "svelte/transition";
  import { onMount } from "svelte";
  import { registerSW } from "virtual:pwa-register";
  import { formatCatalogUpdatedDate } from "@constants/data-catalog";
  import { APP_VERSION_LABEL } from "@constants/version";
  import { getAppData } from "@lib/context";
  import { slideDismiss, slideReveal } from "@lib/motion";
  import {
    modalStore,
    syncToastStore,
    adminAuthStore,
    toastStore,
  } from "@lib/store.svelte";
  import OfflineMaps from "@ui/OfflineMaps.svelte";
  import SyncStatus from "@ui/SyncStatus.svelte";
  import MapChromeSession from "@ui/map-chrome/MapChromeSession.svelte";
  import MapChromeGhostButton from "@ui/map-chrome/MapChromeGhostButton.svelte";
  import "./map-chrome/map-chrome.css";
  import { observeBlockHeight } from "@lib/layout-css-vars";
  import { MediaQuery } from "svelte/reactivity";

  const appData = getAppData();
  const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");
  const { directionCount, totalRooms } = $derived(appData());
  let isOpen = $state(false);
  const showFullSync = $derived(isOpen);
  const detailsCompact = $derived(!isOpen);
  const contributorSession = $derived(
    adminAuthStore.isLoggedIn &&
      !adminAuthStore.canPublish &&
      !adminAuthStore.canReview,
  );
  const sessionDisplayName = $derived(
    adminAuthStore.displayName ?? adminAuthStore.username ?? "Contributor",
  );
  const sessionRoleLabel = $derived(
    adminAuthStore.role === "admin"
      ? "Admin"
      : adminAuthStore.role === "editor"
        ? "Editor"
        : "Contributor",
  );
  const showSessionChip = $derived(contributorSession && !isOpen);
  const showSessionUtilities = $derived(contributorSession && isOpen);
  const progressPercent = $derived(
    totalRooms > 0 ? Math.floor((directionCount / totalRooms) * 100) : 0,
  );
  const catalogUpdatedLabel = formatCatalogUpdatedDate();
  const showDirectionsProgress = $derived(
    directionCount != null && totalRooms != null && totalRooms > 0,
  );

  let barEl = $state<HTMLDivElement | null>(null);

  $effect(() => {
    const el = barEl;
    if (!el) return;
    return observeBlockHeight(el, "--status-bar-block-height");
  });

  onMount(() => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        syncToastStore.markNeedRefresh();
      },
      onRegisteredSW(swScriptUrl) {
        console.log("SW registered: ", swScriptUrl);
      },
    });
    syncToastStore.setRefreshHandler(() => {
      void updateSW(true);
    });
  });

  async function handleSignOut() {
    await adminAuthStore.logout();
    toastStore.show("Signed out.", "info");
  }
</script>

<div class="status-bar" class:is-open={isOpen} bind:this={barEl}>
  <div class="status-head">
    <button
      class="status-toggle"
      aria-expanded={isOpen}
      aria-controls="status-bar-details"
      onclick={() => (isOpen = !isOpen)}
    >
      {#if isOpen}
        <ChevronDown size={18} aria-hidden="true" />
      {:else}
        <ChevronRight size={18} aria-hidden="true" />
      {/if}
      <span>Status</span>
    </button>

    {#if isOpen}
      <div class="status-utilities">
        <SyncStatus inline compact={false} expanded={showFullSync} />
        <span class="status-sep" aria-hidden="true">·</span>
        <OfflineMaps compact={false} />
        {#if showSessionUtilities}
          <span class="status-sep" aria-hidden="true">·</span>
          <MapChromeSession
            roleLabel={sessionRoleLabel}
            displayName={sessionDisplayName}
            utilities
            onSignOut={handleSignOut}
          />
        {/if}
      </div>
    {:else}
      <div class="status-primary">
        <SyncStatus inline compact={detailsCompact} expanded={showFullSync} />
        <OfflineMaps compact={detailsCompact} />
        {#if showSessionChip}
          <MapChromeSession
            roleLabel={sessionRoleLabel}
            displayName={sessionDisplayName}
            title="Signed in as {sessionRoleLabel.toLowerCase()}"
            compact
            onSignOut={handleSignOut}
          />
        {/if}
        {#if showDirectionsProgress}
          <span class="status-sep" aria-hidden="true">·</span>
          <span
            class="status-collapsed-count"
            title="{directionCount} of {totalRooms} rooms with directions"
          >
            <span class="status-count-wide"
              >{directionCount} of {totalRooms} rooms with directions</span
            >
            <span class="status-count-narrow"
              >{directionCount}/{totalRooms} w/ directions</span
            >
          </span>
        {/if}
      </div>
    {/if}
  </div>

  {#if isOpen}
    <div
      class="status-meta"
      id="status-bar-details"
      in:slide={slideReveal(reducedMotion.current)}
      out:slide={slideDismiss(reducedMotion.current)}
    >
      {#if showDirectionsProgress}
        <div
          class="status-meta-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={totalRooms}
          aria-valuenow={directionCount}
          aria-label="{directionCount} of {totalRooms} rooms with directions"
        >
          <div class="map-chrome-progress">
            <div
              class="map-chrome-progress__value"
              style:width={`${progressPercent}%`}
            ></div>
          </div>
          <span class="status-meta-count">
            <span class="status-count-wide"
              >{directionCount} of {totalRooms} rooms with directions</span
            >
            <span class="status-count-narrow"
              >{directionCount}/{totalRooms} w/ directions</span
            >
          </span>
        </div>

        <span class="status-sep" aria-hidden="true">·</span>
      {/if}
      <span class="status-meta-updated">
        Updated {catalogUpdatedLabel}
      </span>

      <span class="status-meta-links">
        <span class="status-sep" aria-hidden="true">·</span>
        <a
          href="/messenger"
          target="_blank"
          rel="noopener noreferrer"
          class="map-chrome-ghost-link status-meta-link"
        >
          <MessageCircle size={14} aria-hidden="true" />
          Contact
        </a>

        <span class="status-sep" aria-hidden="true">·</span>
        <MapChromeGhostButton
          variant="muted"
          onclick={() => modalStore.openModal("landing")}
        >
          Contributors
        </MapChromeGhostButton>

        {#if !adminAuthStore.isLoggedIn}
          <span class="status-sep" aria-hidden="true">·</span>
          <MapChromeGhostButton
            variant="muted"
            onclick={() => adminAuthStore.openLogin()}
          >
            Editor sign in
          </MapChromeGhostButton>
        {/if}

        <span class="status-sep" aria-hidden="true">·</span>
        <a href="/changelog" class="map-chrome-ghost-link status-meta-link">
          <GitFork size={14} aria-hidden="true" />
          {APP_VERSION_LABEL}
        </a>
      </span>
    </div>
  {/if}
</div>

<style>
  * {
    pointer-events: auto;
  }

  div.status-bar {
    position: relative;
    z-index: 16;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    width: fit-content;
    max-width: calc(100% - var(--bottom-fab-inset, 0px));
    margin-left: auto;
    align-self: flex-end;
    min-width: 0;
    overflow: visible;
    font-size: 0.8125rem;
    font-weight: 600;
    line-height: 1.2;
    gap: 0.0625rem;
    flex: 0 0 auto;
    min-height: 2rem;
    box-sizing: border-box;
    background-color: var(--map-chrome-surface, rgba(255, 255, 255, 0.98));
    backdrop-filter: blur(10px);
    border: 1px solid var(--map-chrome-border, hsl(0, 0%, 58%));
    padding: 0.125rem 0.5rem;
    border-radius: 1rem;
    box-shadow: var(
      --map-chrome-panel-shadow,
      0 0 0 1px hsla(0, 0%, 0%, 0.14),
      0 4px 14px hsla(0, 0%, 0%, 0.2),
      0 10px 28px hsla(0, 0%, 0%, 0.12)
    );
    transition:
      width var(--motion-duration-micro) var(--motion-ease-out),
      gap var(--motion-duration-micro) var(--motion-ease-out),
      padding var(--motion-duration-micro) var(--motion-ease-out);

    &.is-open {
      width: min(44rem, calc(100% - var(--bottom-fab-inset, 0px)));
      gap: 0.0625rem;
      padding: 0.1875rem 0.5rem 0.25rem;
    }

    .status-head {
      display: flex;
      align-items: center;
      gap: 0.3125rem;
      min-width: 0;
      flex-wrap: nowrap;
    }

    .status-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      background: none;
      border: none;
      font: inherit;
      padding: 0;
      cursor: pointer;
      min-width: 0;
      flex: 0 0 auto;
      color: inherit;
    }

    .status-toggle:focus-visible {
      outline: 2px solid hsl(5, 53%, 32%);
      outline-offset: 2px;
      border-radius: 0.25rem;
    }

    .status-primary,
    .status-utilities {
      display: flex;
      flex: 1 1 auto;
      align-items: center;
      gap: 0.3125rem;
      min-width: 0;
      overflow: hidden;
      flex-wrap: nowrap;
    }

    .status-primary :global(.sync-status--inline),
    .status-utilities :global(.sync-status--inline) {
      border-right: none;
      padding-right: 0;
      margin-right: 0;
    }

    .status-utilities {
      font-size: 0.75rem;
      font-weight: 500;
    }

    .status-sep {
      flex-shrink: 0;
      color: hsl(0, 0%, 68%);
      font-weight: 400;
      line-height: 1;
      user-select: none;
    }

    .status-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.1875rem 0.3125rem;
      width: 100%;
      min-width: 0;
      font-size: 0.75rem;
      font-weight: 500;
      line-height: 1.2;
      color: hsl(0, 0%, 28%);
    }

    .status-meta-links {
      display: inline-flex;
      flex: 1 1 auto;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.1875rem 0.3125rem;
      min-width: 0;
    }

    .status-meta-progress {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      flex: 0 1 auto;
      min-width: 0;
      max-width: 100%;
    }

    .status-meta-progress :global(.map-chrome-progress) {
      width: min(3rem, 11vw);
      flex: 0 0 auto;
      height: 0.375rem;
    }

    .status-meta-count {
      flex-shrink: 0;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
      color: hsl(0, 0%, 22%);
    }

    .status-count-wide {
      display: inline;
    }

    .status-count-narrow {
      display: none;
    }

    .status-collapsed-count {
      flex: 0 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: inherit;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: hsl(0, 0%, 28%);
    }

    .status-meta-updated {
      flex-shrink: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .status-meta :global(.map-chrome-ghost-link),
    .status-meta :global(.map-chrome-ghost-btn) {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0 0.1875rem;
    }

    .status-meta-link {
      white-space: nowrap;
    }
  }

  @media (max-width: 48rem) {
    div.status-bar {
      width: 100%;
      max-width: 100%;
      margin-left: 0;
      align-self: stretch;
      min-height: 2rem;
      padding: 0.125rem 0.4375rem;
      padding-bottom: calc(0.125rem + env(safe-area-inset-bottom, 0px));
      gap: 0.0625rem;
      border-radius: 0;
      border-left: none;
      border-right: none;
      border-bottom: none;
      backdrop-filter: none;

      &.is-open {
        width: 100%;
        padding: 0.1875rem 0.4375rem;
        padding-bottom: calc(0.1875rem + env(safe-area-inset-bottom, 0px));
      }

      .status-head {
        gap: 0.25rem;
      }

      .status-primary {
        gap: 0.25rem;
        flex-wrap: wrap;
      }

      .status-utilities {
        gap: 0.25rem;
        flex-wrap: nowrap;
      }

      .status-meta {
        gap: 0.125rem 0.25rem;
      }

      .status-meta-links {
        gap: 0.125rem 0.25rem;
      }

      .status-meta-progress {
        flex-basis: auto;
      }
    }
  }

  @media (max-width: 1200px) {
    .status-meta-updated,
    .status-meta-updated + .status-meta-links .status-sep:first-child {
      display: none;
    }
  }

  @media (max-width: 22rem) {
    .status-meta-progress :global(.map-chrome-progress) {
      width: 2.5rem;
    }

    .status-count-wide {
      display: none;
    }

    .status-count-narrow {
      display: inline;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    div.status-bar {
      transition: none;
    }
  }
</style>
