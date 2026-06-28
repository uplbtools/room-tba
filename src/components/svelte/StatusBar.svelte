<script lang="ts">
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import MessageCircle from "@lucide/svelte/icons/message-circle";
  import { onMount } from "svelte";
  import { registerSW } from "virtual:pwa-register";
  import { APP_VERSION_LABEL } from "@constants/version";
  import { getAppData } from "@lib/context";
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

  const appData = getAppData();
  const { directionCount, totalRooms } = $derived(appData());
  let isOpen = $state(false);
  /** Full sync copy only when the status drawer is expanded. */
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
  const showSessionExpanded = $derived(contributorSession && isOpen);

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
  <button
    class="status-toggle"
    aria-expanded={isOpen}
    aria-controls="status-bar-details"
    onclick={() => (isOpen = !isOpen)}
  >
    {#if isOpen}
      <ChevronDown size={20} />
    {:else}
      <ChevronRight size={20} />
    {/if}
    <span>Status</span>
  </button>

  <div class="status-primary">
    <SyncStatus
      inline
      compact={detailsCompact}
      expanded={showFullSync}
    />

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
  </div>

  <div class="content-wrapper" id="status-bar-details">
    <div class="content-primary-row">
      {#if showSessionExpanded}
        <MapChromeSession
          roleLabel={sessionRoleLabel}
          displayName={sessionDisplayName}
          expanded
          onSignOut={handleSignOut}
        />
      {/if}
      <div class="directions-progress">
        <span class="directions-label">Rooms with directions</span>
        <div
          class="map-chrome-progress map-chrome-progress--lg"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={totalRooms}
          aria-valuenow={directionCount}
          aria-label="Rooms with directions"
        >
          <div
            class="map-chrome-progress__value"
            style:width={`${Math.floor((directionCount / totalRooms) * 100)}%`}
          ></div>
        </div>
        <span class="directions-count">{directionCount} / {totalRooms}</span>
      </div>
    </div>
    <div class="metadata">
      <div class="data-updated">
        Course and room information is updated regularly. Last updated:
        <strong>June 2026.</strong>
      </div>
      <div>
        <a
          href="/messenger"
          target="_blank"
          rel="noopener noreferrer"
          class="map-chrome-ghost-link"
        >
          <MessageCircle size={18} />
          <div>Contact</div>
        </a>
      </div>
      <div>
        <MapChromeGhostButton
          variant="muted"
          onclick={() => modalStore.openModal("landing")}
        >
          Contributors
        </MapChromeGhostButton>
      </div>
      {#if !adminAuthStore.isLoggedIn}
        <div>
          <MapChromeGhostButton
            variant="muted"
            onclick={() => adminAuthStore.openLogin()}
          >
            Editor sign in
          </MapChromeGhostButton>
        </div>
      {/if}
      <div class="app-version">
        <a href="/changelog" class="map-chrome-ghost-link changelog-link">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide lucide-git-fork-icon lucide-git-fork"
            ><circle cx="12" cy="18" r="3"></circle><circle cx="6" cy="6" r="3"
            ></circle><circle cx="18" cy="6" r="3"></circle><path
              d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9"
            ></path><path d="M12 12v3"></path></svg
          >
          <div>{APP_VERSION_LABEL}</div>
        </a>
      </div>
    </div>
  </div>
</div>

<style>
  * {
    pointer-events: auto;
  }
  div.status-bar {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    width: fit-content;
    max-width: calc(100% - var(--bottom-fab-inset, 0px));
    margin-left: auto;
    align-self: flex-end;
    min-width: 0;
    overflow: visible;
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.2;
    gap: 0.5rem;
    flex: 0 0 auto;
    min-height: 2rem;
    box-sizing: border-box;
    background-color: var(--map-chrome-surface, rgba(255, 255, 255, 0.98));
    backdrop-filter: blur(10px);
    border: 1px solid var(--map-chrome-border, hsl(0, 0%, 58%));
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    box-shadow: var(
      --map-chrome-panel-shadow,
      0 0 0 1px hsla(0, 0%, 0%, 0.14),
      0 4px 14px hsla(0, 0%, 0%, 0.2),
      0 10px 28px hsla(0, 0%, 0%, 0.12)
    );
    transition: all 0.2s ease;

    .status-toggle {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: none;
      border: none;
      font: inherit;
      padding: 0;
      cursor: pointer;
      min-width: 0;
      flex: 0 0 auto;
      color: inherit;
    }

    .status-primary {
      display: flex;
      flex: 1 1 auto;
      align-items: center;
      gap: 0.5rem;
      min-width: 0;
      overflow: hidden;
      position: relative;
    }

    .content-wrapper {
      display: none;
      gap: 0.25rem;
      flex: 0 0 auto;
      width: 100%;
      min-width: 0;
      max-width: 100%;
      flex-direction: column;
      align-items: stretch;
      justify-content: flex-start;
      overflow: visible;
      padding-top: 0.25rem;
      border-top: 1px solid hsl(0, 0%, 88%);
    }

    .content-primary-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.375rem 0.75rem;
      width: 100%;
      min-width: 0;
    }

    .content-primary-row :global(.map-chrome-session-expanded) {
      flex: 1 1 auto;
      min-width: min(100%, 12rem);
      width: auto;
      padding-bottom: 0;
    }

    &.is-open {
      flex-wrap: wrap;
      align-items: flex-start;
      width: min(44rem, calc(100% - var(--bottom-fab-inset, 0px)));
    }

    &.is-open .content-wrapper {
      display: flex;
    }

    .metadata {
      flex: 0 1 auto;
      min-width: 0;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0;
      row-gap: 0;
      overflow: visible;
      font-size: 0.8125rem;
      & > *:not(:last-child) {
        border-right: 1px solid hsl(0, 0%, 78%);
        padding-right: 0.5rem;
      }
      & > *:not(:first-child) {
        padding-left: 0.5rem;
      }
      :global(.map-chrome-ghost-link),
      :global(.map-chrome-ghost-btn) {
        padding: 0.0625rem 0.25rem;
        font-size: 0.8125rem;
      }
    }

    .app-version {
      .changelog-link {
        white-space: nowrap;
      }
    }
    .data-updated {
      overflow: hidden;
      min-width: 0;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .directions-progress {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      flex: 0 0 auto;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      font-size: 0.8125rem;
      .directions-label {
        flex-shrink: 1;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .directions-count {
        flex-shrink: 0;
        font-variant-numeric: tabular-nums;
      }
      :global(.map-chrome-progress) {
        width: min(4.5rem, 14vw);
        flex: 0 0 auto;
      }
      :global(.map-chrome-progress--lg) {
        height: 0.625rem;
      }
    }
  }

  @media (max-width: 48rem) {
    div.status-bar {
      width: 100%;
      max-width: 100%;
      margin-left: 0;
      align-self: stretch;
      min-height: 2rem;
      padding: 0.25rem 0.625rem;
      padding-bottom: calc(0.25rem + env(safe-area-inset-bottom, 0px));
      gap: 0.375rem;
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: center;
      border-radius: 0;
      border-left: none;
      border-right: none;
      border-bottom: none;

      &.is-open {
        flex-wrap: wrap;
        align-items: flex-start;
        width: 100%;
      }

      .status-primary {
        flex: 1 1 auto;
        gap: 0.375rem;
      }

      .content-wrapper {
        gap: 0.1875rem;
        padding-top: 0.1875rem;
        width: 100%;
      }

      .content-primary-row {
        flex-direction: column;
        align-items: stretch;
        gap: 0.1875rem;
      }

      .content-primary-row :global(.map-chrome-session-expanded) {
        width: 100%;
        min-width: 0;
      }

      .directions-progress {
        width: 100%;
        justify-content: space-between;
        flex-basis: auto;
      }

      .metadata {
        width: 100%;
        align-items: stretch;
        flex-wrap: wrap;
        gap: 0.125rem;

        & > *:not(:last-child),
        & > *:not(:first-child) {
          border-right: none;
          padding: 0;
        }

        .data-updated {
          margin-left: 0;
        }

        .app-version {
          justify-content: flex-start;
        }
      }
    }
  }

  @media (max-width: 1200px) {
    .data-updated {
      display: none;
    }
  }

  @media (max-width: 1024px) {
    .directions-label {
      display: none;
    }
  }

  @media (max-width: 48rem) {
    div.status-bar {
      backdrop-filter: none;
      background-color: var(--map-chrome-surface, rgba(255, 255, 255, 0.98));
    }
  }
</style>
