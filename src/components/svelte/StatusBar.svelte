<script lang="ts">
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import MessageCircle from "@lucide/svelte/icons/message-circle";
  import { onMount } from "svelte";
  import { registerSW } from "virtual:pwa-register";
  import { APP_VERSION_LABEL } from "../../constants/version";
  import { getAppData } from "../../lib/context";
  import {
    modalStore,
    syncToastStore,
    adminAuthStore,
    toastStore,
  } from "../../lib/store.svelte";
  import OfflineMaps from "./OfflineMaps.svelte";
  import SyncStatus from "./SyncStatus.svelte";
  import MapChromeSession from "./map-chrome/MapChromeSession.svelte";
  import MapChromeGhostButton from "./map-chrome/MapChromeGhostButton.svelte";
  import "./map-chrome/map-chrome.css";
  import { observeBlockHeight } from "../../lib/layout-css-vars";
  import { MediaQuery } from "svelte/reactivity";

  const appData = getAppData();
  const { directionCount, totalRooms } = $derived(appData());
  let isOpen = $state(false);
  const mobile = new MediaQuery("max-width:48rem");
  /** Full sync copy only when the mobile status drawer is expanded. */
  const showFullSync = $derived(mobile.current && isOpen);
  const contributorSession = $derived(
    adminAuthStore.isLoggedIn &&
      !adminAuthStore.canPublish &&
      !adminAuthStore.canReview,
  );
  const editorSession = $derived(
    adminAuthStore.isLoggedIn &&
      (adminAuthStore.canPublish || adminAuthStore.canReview),
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
      compact={mobile.current && !showFullSync}
      expanded={showFullSync}
    />

    <OfflineMaps compact={mobile.current && !isOpen} />

    {#if contributorSession || editorSession}
      <MapChromeSession
        label="{sessionRoleLabel}: {sessionDisplayName}"
        compactLabel={sessionDisplayName}
        title="Signed in as {sessionRoleLabel.toLowerCase()}"
        compact={mobile.current && !isOpen}
        onSignOut={handleSignOut}
      />
    {/if}
  </div>

  <div class="content-wrapper" id="status-bar-details">
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
      <div>
        {directionCount} / {totalRooms}
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
    min-width: 0;
    overflow: visible;
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.2;
    gap: 0.75rem;
    flex: 0 0 auto;
    min-height: 2.375rem;
    box-sizing: border-box;
    background-color: var(--map-chrome-surface, rgba(255, 255, 255, 0.98));
    backdrop-filter: blur(10px);
    border: 1px solid var(--map-chrome-border, hsl(0, 0%, 58%));
    padding: 0.375rem 1rem;
    border-radius: 1rem;
    box-shadow: var(
      --map-chrome-panel-shadow,
      0 0 0 1px hsla(0, 0%, 0%, 0.14),
      0 4px 14px hsla(0, 0%, 0%, 0.2),
      0 10px 28px hsla(0, 0%, 0%, 0.12)
    );
    transition: all 0.2s ease;

    .status-toggle {
      display: none;
      align-items: center;
      gap: 0.5rem;
      background: none;
      border: none;
      font: inherit;
      padding: 0;
      cursor: pointer;
      min-width: 0;
      flex: 0 0 auto;
    }

    .status-primary {
      display: flex;
      flex: 1 1 auto;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
      overflow: visible;
      position: relative;
    }

    .content-wrapper {
      display: flex;
      gap: 1rem;
      flex: 0 1 auto;
      min-width: 0;
      max-width: 100%;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-start;
      overflow: visible;
    }

    .metadata {
      flex: 0 1 auto;
      min-width: 0;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0;
      row-gap: 0.125rem;
      overflow: visible;
      & > *:not(:last-child) {
        border-right: 2px solid #aaa;
        padding-right: 0.75rem;
      }
      & > *:not(:first-child) {
        padding-left: 0.75rem;
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
      gap: 0.5rem;
      flex: 0 1 auto;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      .directions-label {
        flex-shrink: 1;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      :global(.map-chrome-progress) {
        width: min(5.5rem, 14vw);
        flex: 0 0 auto;
      }
    }
  }

  @media (max-width: 48rem) {
    div.status-bar {
      width: 100%;
      max-width: 100%;
      min-height: 2.375rem;
      padding: 0.3125rem 0.75rem;
      padding-bottom: calc(0.3125rem + env(safe-area-inset-bottom, 0px));
      gap: 0.5rem;
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: center;
      border-radius: 0;
      border-left: none;
      border-right: none;
      border-bottom: none;

      .status-toggle {
        display: flex;
        flex: 0 0 auto;
        min-height: 0;
      }

      .status-primary {
        flex: 1 1 auto;
        gap: 0.625rem;
      }

      .content-wrapper {
        display: none;
        flex-basis: 100%;
        flex-direction: column;
        gap: 0.125rem;
        padding-top: 0.25rem;
        border-top: 1px solid #eee;
        width: 100%;
        overflow: visible;
      }

      &.is-open {
        flex-wrap: wrap;
      }

      &.is-open .content-wrapper {
        display: flex;
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

  @media (min-width: 48.0625rem) and (max-width: 50rem) {
    div.status-bar {
      width: 100%;
      max-width: calc(100% - var(--bottom-fab-inset, 0px));
      padding: 0.3125rem 1rem;
      gap: 0.25rem;
      flex-direction: column;
      align-items: stretch;
      overflow: visible;

      .status-toggle {
        display: flex;
        min-height: 1.5rem;
      }

      .content-wrapper {
        display: none;
        flex-direction: column;
        gap: 0.125rem;
        padding-top: 0.25rem;
        border-top: 1px solid #eee;
        width: 100%;
        overflow: visible;
      }

      &.is-open .content-wrapper {
        display: flex;
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
