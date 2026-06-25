<script lang="ts">
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import MessageCircle from "@lucide/svelte/icons/message-circle";
  import { onMount } from "svelte";
  import { registerSW } from "virtual:pwa-register";
  import { APP_VERSION_LABEL } from "../../constants/version";
  import { getAppData } from "../../lib/context";
  import { modalStore, syncToastStore } from "../../lib/store.svelte";
  import OfflineMaps from "./OfflineMaps.svelte";
  import SyncStatus from "./SyncStatus.svelte";
  import { MediaQuery } from "svelte/reactivity";

  const appData = getAppData();
  const { directionCount, totalRooms } = $derived(appData());
  let isOpen = $state(false);
  const mobile = new MediaQuery("max-width:48rem");
  /** Full sync copy only when the mobile status drawer is expanded. */
  const showFullSync = $derived(mobile.current && isOpen);

  let barEl = $state<HTMLDivElement | null>(null);

  $effect(() => {
    const el = barEl;
    if (!el || typeof ResizeObserver === "undefined") return;

    const root = el.closest(".app-layout") as HTMLElement | null;
    if (!root) return;

    const syncHeight = () => {
      root.style.setProperty(
        "--status-bar-block-height",
        `${el.getBoundingClientRect().height}px`,
      );
    };

    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(el);
    return () => observer.disconnect();
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
</script>

<div class="status-bar" class:is-open={isOpen} bind:this={barEl}>
  <button class="status-toggle" onclick={() => (isOpen = !isOpen)}>
    {#if isOpen}
      <ChevronDown size={20} />
    {:else}
      <ChevronRight size={20} />
    {/if}
    <span>Status</span>
  </button>

  <SyncStatus
    inline
    compact={mobile.current && !showFullSync}
    expanded={showFullSync}
  />

  <div class="status-offline">
    <OfflineMaps />
  </div>

  <div class="content-wrapper">
    <div class="directions-progress">
      <span class="directions-label">Rooms with directions</span>
      <div class="progress-bar">
        <div
          class="progress-bar__value"
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
          class="messenger-link"
        >
          <MessageCircle size={18} />
          <div>Contact</div>
        </a>
      </div>
      <div>
        <button
          class="contributors-btn"
          onclick={() => modalStore.openModal("landing")}
        >
          Contributors
        </button>
      </div>
      <div class="app-version">
        <a href="/changelog" class="changelog-link">
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
      flex: 1;
    }

    .status-offline {
      flex: 0 0 auto;
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

    .messenger-link {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      text-decoration: none;
      color: inherit;
      padding: 0.125rem 0.375rem;
      &:hover {
        border-radius: 0.5rem;
        background-color: hsla(0, 0%, 0%, 0.1);
      }
    }
    .contributors-btn {
      background: none;
      border: none;
      padding: 0;
      font: inherit;
      cursor: pointer;
      color: inherit;
      padding: 0.125rem 0.375rem;
      &:hover {
        border-radius: 0.5rem;
        background-color: hsla(0, 0%, 0%, 0.1);
      }
    }
    .app-version {
      .changelog-link {
        display: flex;
        gap: 0.25rem;
        white-space: nowrap;
        color: unset;
        text-decoration: unset;
        padding: 0.125rem 0.375rem;
        &:hover {
          border-radius: 0.5rem;
          background-color: hsla(0, 0%, 0%, 0.1);
        }
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
      .progress-bar {
        width: min(5.5rem, 14vw);
        height: 0.75rem;
        flex: 0 0 auto;
        border-radius: 0.5rem;
        background-color: #ddd;
        position: relative;
        .progress-bar__value {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          background-color: #7b1113;
          border-radius: 0.5rem;
        }
      }
    }
  }

  @media (max-width: 800px) {
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

        .status-offline {
          width: 100%;
          border-left: none;
          padding-left: 0;
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
</style>
