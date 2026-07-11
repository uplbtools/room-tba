<script lang="ts">
  import { onMount } from "svelte";
  import type { InitialSearchState } from "@lib/app-data";
  import {
    modalStore,
    queryStore,
    locationStore,
    toastStore,
    building3DStore,
    adminAuthStore,
    mapEditStore,
    mapToolsStore,
    editorChromeStore,
    jeepneyStore,
    appBootstrapStore,
    plannerStore,
    termStore,
    sidebarStore,
  } from "@lib/store.svelte";
  import { decodeSharePlan } from "@lib/planner/share-codec";
  import { resolveSharedPlan } from "@lib/planner/import-shared";
  import Modal from "@ui/modal/Modal.svelte";
  import MainControls from "@ui/controls/MainControls.svelte";
  import Map from "@ui/Map.svelte";
  import MapToolsFlyout from "@ui/MapToolsFlyout.svelte";
  import MapViewControls from "@ui/MapViewControls.svelte";
  import MapDimensionToggle from "@ui/MapDimensionToggle.svelte";
  import LocationButton from "@ui/LocationButton.svelte";
  import MapAttribution from "@ui/MapAttribution.svelte";
  import StatusBar from "@ui/StatusBar.svelte";
  import Toast from "@ui/Toast.svelte";
  import Building3DViewer from "@ui/Building3DViewer.svelte";
  import AdminLoginModal from "@ui/AdminLoginModal.svelte";
  import AccountSettingsModal from "@ui/AccountSettingsModal.svelte";
  import ManageUsersModal from "@ui/modal/ManageUsersModal.svelte";
  import EditorAdditionModal from "@ui/EditorAdditionModal.svelte";
  import EditorScreen from "@ui/EditorScreen.svelte";
  import PlannerScreen from "@ui/planner/PlannerScreen.svelte";
  import EntityUrlSync from "@ui/EntityUrlSync.svelte";
  import EntityHoverPreview from "@ui/map/EntityHoverPreview.svelte";
  import "./map-chrome/map-chrome.css";
  import { observeBlockHeight, observeBlockWidth } from "@lib/layout-css-vars";
  import {
    dispatchGlobalShortcut,
    getGlobalShortcutAction,
  } from "@lib/keyboard-shortcuts";
  import { dismissEphemeralOverlays } from "@lib/overlay-stack";
  import { shouldAutoOpenLandingModal } from "@lib/landing-modal-auto-open";
  import Sidebar from "./navigation/Sidebar.svelte";
  import KeyboardShortcutsPopup from "./map-chrome/KeyboardShortcutsPopup.svelte";

  type Props = {
    initialSearch?: InitialSearchState;
    suppressLandingModal?: boolean;
    openPlanner?: boolean;
  };

  const {
    initialSearch,
    suppressLandingModal = false,
    openPlanner = false,
  }: Props = $props();

  const updateData = (queryHistory: RecentSearch[]) => {
    localStorage.setItem("recent-search", JSON.stringify(queryHistory));
  };

  // Capture one-shot URL params (editor=login, auth_error, account, share
  // codes) at script init. Child components like EntityUrlSync normalize the
  // URL in their onMount, which fires before this parent component's onMount,
  // so reading window.location.search there would see an already-stripped URL.
  const initialUrlSearch =
    typeof window !== "undefined" ? window.location.search : "";

  onMount(() => {
    const recentSearchesLS = localStorage.getItem("recent-search");
    try {
      const parsedSearches: unknown[] = JSON.parse(recentSearchesLS ?? "[]");
      parsedSearches.forEach((parsedSearch) => {
        if (isRecentSearch(parsedSearch)) {
          queryStore.addRecentSearch(parsedSearch);
        }
      });
    } catch {
      queryStore.recentSearches = [];
    }
    if (initialSearch) {
      queryStore.hydrateQuery({
        category: initialSearch.category,
        type: "result",
        value: initialSearch.value,
        eventSlug: initialSearch.eventSlug,
      });
    }

    const urlParams = new URLSearchParams(initialUrlSearch);

    if (urlParams.get("editor") === "login") {
      adminAuthStore.openLogin();
      window.history.replaceState({}, "", window.location.pathname);
    }

    const authError = urlParams.get("auth_error");
    if (authError) {
      adminAuthStore.oauthError = authError;
      adminAuthStore.openLogin();
      window.history.replaceState({}, "", window.location.pathname);
    }

    const accountEvent = urlParams.get("account");
    if (accountEvent === "email-changed") {
      toastStore.show("Email address updated.", "success");
      adminAuthStore.openAccountSettings();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (accountEvent === "google-linked") {
      toastStore.show("Google account connected.", "success");
      adminAuthStore.openAccountSettings();
      window.history.replaceState({}, "", window.location.pathname);
    }

    const accountError = urlParams.get("account_error");
    if (accountError) {
      const messages: Record<string, string> = {
        missing_token: "That confirmation link is missing its token.",
        invalid_or_expired_token:
          "That confirmation link is invalid or has expired. Request a new one.",
        not_logged_in:
          "Sign in first, then connect Google from account settings.",
        missing_code: "Google sign-in was cancelled or incomplete. Try again.",
        oauth_failed: "Connecting Google failed. Try again.",
        already_linked:
          "That Google account is already connected to a different Room TBA account.",
      };
      toastStore.show(
        messages[accountError] ?? "Something went wrong. Try again.",
        "error",
      );
      adminAuthStore.openAccountSettings();
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (urlParams.get("contribute") === "1") {
      editorChromeStore.openAdditionModal();
      window.history.replaceState({}, "", window.location.pathname);
    }

    plannerStore.init();

    // /planner deep link (prop set by the planner.astro page). Driven by a prop,
    // not window.location, because the SPA URL router normalizes the path to "/"
    // on boot before this runs. ?term still flows through termStore.
    if (openPlanner) {
      void termStore.init();
      plannerStore.openPlanner();
    }

    const planParam = urlParams.get("plan");
    if (planParam) {
      window.history.replaceState({}, "", window.location.pathname);
      const decoded = decodeSharePlan(planParam);
      if (!decoded) {
        toastStore.show("That plan link is invalid.", "error");
      } else {
        void termStore
          .init()
          .then(() => resolveSharedPlan(decoded))
          .then(({ sections, missing }) => {
            plannerStore.importShared(decoded.termId, sections);
            if (termStore.terms.some((term) => term.id === decoded.termId)) {
              termStore.setTerm(decoded.termId);
            }
            plannerStore.openPlanner();
            if (missing > 0) {
              toastStore.show(
                `${missing} shared ${missing === 1 ? "section is" : "sections are"} no longer offered.`,
                "info",
              );
            }
          });
      }
    }
  });

  let landingModalAutoOpenConsumed = $state(false);

  $effect(() => {
    if (
      !shouldAutoOpenLandingModal({
        consumed: landingModalAutoOpenConsumed,
        phase: appBootstrapStore.phase,
        suppressLandingModal,
        hideLandingModal: localStorage.getItem("hideLandingModal") === "true",
        modalOpen: modalStore.open,
      })
    ) {
      return;
    }
    landingModalAutoOpenConsumed = true;
    modalStore.openModal("landing");
  });
  $effect(() => {
    updateData(queryStore.recentSearches);
  });

  let mapToolsStackEl = $state<HTMLDivElement | null>(null);
  let bottomChromeEl = $state<HTMLDivElement | null>(null);
  let bottomChromeActionsEl = $state<HTMLDivElement | null>(null);

  $effect(() => {
    const el = mapToolsStackEl;
    if (!el) return;
    return observeBlockHeight(el, "--map-tools-block-height", {
      shouldSkip: () => window.matchMedia("(max-width: 48rem)").matches,
      skipValue: "0px",
    });
  });

  $effect(() => {
    const el = bottomChromeEl;
    if (!el) return;
    const root = el.closest(".app-layout") as HTMLElement | null;
    if (!root) return;

    let rafId = 0;
    let lastHeight = "";
    let lastInset = "";

    const sync = () => {
      rafId = 0;
      const rect = el.getBoundingClientRect();
      const height = `${Math.max(0, Math.round(rect.height))}px`;
      const inset = `${Math.max(0, Math.round(window.innerHeight - rect.top))}px`;

      if (height !== lastHeight) {
        lastHeight = height;
        root.style.setProperty("--status-bar-block-height", height);
      }
      if (inset !== lastInset) {
        lastInset = inset;
        root.style.setProperty("--side-panel-bottom-inset-measured", inset);
      }
    };

    const schedule = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(sync);
    };

    sync();
    const observer = new ResizeObserver(schedule);
    observer.observe(el);
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      if (rafId) cancelAnimationFrame(rafId);
    };
  });

  $effect(() => {
    const el = bottomChromeActionsEl;
    if (!el) return;
    return observeBlockWidth(el, "--bottom-fab-inset", {
      onSync: (widthPx, root) => {
        root.style.setProperty(
          "--bottom-fab-inset",
          `calc(${widthPx} + var(--bottom-chrome-gap, var(--bottom-fab-gap, 0.5rem)))`,
        );
      },
    });
  });

  function handleKeydown(e: KeyboardEvent) {
    const action = getGlobalShortcutAction(e);
    if (action) {
      e.preventDefault();
      dispatchGlobalShortcut(action);
      return;
    }

    if (e.key === "Escape") {
      dismissEphemeralOverlays();
      if (modalStore.open) {
        modalStore.closeModal();
      } else if (building3DStore.buildingName) {
        building3DStore.close();
      } else if (adminAuthStore.loginOpen) {
        adminAuthStore.closeLogin();
      } else if (editorChromeStore.additionModalOpen) {
        editorChromeStore.closeAdditionModal();
      } else if (editorChromeStore.shelfOpen) {
        editorChromeStore.closeShelf();
      } else if (mapToolsStore.open) {
        mapToolsStore.close();
      } else if (jeepneyStore.selectedStopIndex !== null) {
        jeepneyStore.closeStop();
      } else if (queryStore.inputValue !== "" || queryStore.type === "result") {
        queryStore.clearQuery();
        if (locationStore.destination) {
          locationStore.clearDestination();
        }
      }
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<EntityUrlSync />
<EntityHoverPreview />

<div class="app-layout" class:edit-mode={mapEditStore.enabled}>
  <Map />
  <div class="ui-layer">
    <Sidebar />
    {#if sidebarStore.panelOpen === "map"}
      <section
        class="top-right-map-stack"
        aria-label="Map tools"
        bind:this={mapToolsStackEl}
      >
        <MapToolsFlyout />
        <section class="desktop-camera-controls" aria-label="Map camera">
          <div class="camera-controls-card">
            <MapDimensionToggle embedded />
            <div class="camera-controls-card__divider" aria-hidden="true"></div>
            <MapViewControls variant="camera" embedded />
          </div>
        </section>
      </section>
      <div class="inner-layer">
        <MainControls />
        <div class="bottom-band">
          <div class="bottom-chrome" bind:this={bottomChromeEl}>
            <div class="bottom-chrome__bar">
              <div class="bottom-chrome__leading">
                <MapAttribution />
              </div>
              <div class="bottom-chrome__status">
                <StatusBar />
              </div>
            </div>
            <div
              class="bottom-chrome__actions"
              bind:this={bottomChromeActionsEl}
              aria-label="Location controls"
            >
              <LocationButton embedded />
            </div>
          </div>
        </div>
      </div>
    {:else if sidebarStore.panelOpen === "planner"}
      <PlannerScreen />
    {/if}
  </div>
  {#if toastStore.message}
    <Toast
      message={toastStore.message}
      type={toastStore.type}
      onclose={() => toastStore.clear()}
    />
  {/if}
  <Modal />
  <KeyboardShortcutsPopup />
  {#if building3DStore.buildingName}
    <Building3DViewer name={building3DStore.buildingName} />
  {/if}
  {#if adminAuthStore.loginOpen}
    <AdminLoginModal />
  {/if}
  {#if adminAuthStore.accountSettingsOpen}
    <AccountSettingsModal />
  {/if}
  {#if adminAuthStore.manageUsersOpen}
    <ManageUsersModal />
  {/if}
  <EditorAdditionModal />
  <EditorScreen />
</div>

<style>
  .app-layout {
    --map-ui-padding: 0.5rem;
    /* Gap between bottom chrome and edit dock / map padding edge */
    --bottom-fab-gap: var(--map-ui-padding, 0.5rem);
    --bottom-chrome-gap: var(--bottom-fab-gap, 0.5rem);
    --search-block-height: 3.25rem;
    /* Top-left search card + drawer: use viewport minus right-side map chrome. */
    --map-search-chrome-width: min(31rem, calc(100vw - 15rem));
    --status-bar-block-height: 2rem;
    --side-panel-bottom-gap: 0.375rem;
    /* Measured at runtime from .bottom-chrome top edge (see Entry.svelte). */
    --side-panel-bottom-inset-measured: calc(
      var(--status-bar-block-height, 2.75rem) + var(--map-ui-padding, 0.5rem) +
        env(safe-area-inset-bottom, 0px)
    );
    --side-panel-bottom-inset: calc(
      var(--side-panel-bottom-inset-measured) +
        var(--side-panel-bottom-gap, 0.375rem)
    );
    --side-panel-top-inset: calc(
      var(--search-block-height, 3.25rem) + var(--map-ui-padding, 0.5rem) +
        var(--side-panel-top-gap, 0.75rem)
    );
    --side-panel-top-gap: 0.75rem;
    --drawer-peek-offset: 1.75rem;
    --map-tools-block-height: 3.25rem;
    --mobile-detail-sheet-top-inset: calc(
      var(--search-block-height) + var(--map-tools-block-height) +
        var(--map-ui-padding) * 2 + var(--mobile-detail-sheet-gap, 0.375rem)
    );
    --mobile-detail-sheet-gap: 0.375rem;
    --edit-bar-height: 0rem;
    --bottom-fab-inset: 3.75rem;
    --pill-padding-x: 0.875rem;
    --map-chrome-radius: 1rem;
    --map-chrome-toggle-size: 2rem;
    --map-chrome-toggle-radius: 0.625rem;
    /* Map chrome contrast: warm off-white surfaces + stronger edges so controls
       float above light basemap tiles without dimming the map itself. */
    --map-chrome-surface: hsl(5 20% 97%);
    --map-chrome-panel-bg: hsl(5 18% 96%);
    --map-chrome-border: hsl(5 10% 68%);
    --map-chrome-border-accent: hsl(5 40% 42%);
    --map-chrome-divider: hsl(5 12% 88%);
    --map-chrome-panel-accent-border: hsl(5 15% 78%);
    --map-chrome-band-backdrop: hsla(5, 22%, 96%, 0.82);
    --map-chrome-shadow:
      0 0 0 1px hsla(15, 8%, 20%, 0.14), 0 1px 3px hsla(0, 0%, 0%, 0.12),
      0 4px 12px hsla(0, 0%, 0%, 0.16), 0 10px 24px hsla(0, 0%, 0%, 0.1);
    --map-chrome-panel-shadow:
      0 0 0 1px hsla(15, 8%, 20%, 0.16), 0 2px 8px hsla(0, 0%, 0%, 0.14),
      0 8px 20px hsla(0, 0%, 0%, 0.18), 0 16px 32px hsla(0, 0%, 0%, 0.08);
    --map-chrome-fab-shadow:
      inset 0 0 0 1px hsla(0, 0%, 100%, 0.72), 0 2px 6px hsla(0, 0%, 0%, 0.2),
      0 6px 16px hsla(0, 0%, 0%, 0.14);
    --motion-duration-fast: 150ms;
    --motion-duration-micro: 200ms;
    --motion-duration-panel: 280ms;
    --motion-duration-shelf: 260ms;
    --motion-ease-out: cubic-bezier(0.22, 1, 0.36, 1);
    --motion-ease-in: cubic-bezier(0.4, 0, 1, 1);
    @media (prefers-reduced-motion: reduce) {
      --motion-duration-fast: 0ms;
      --motion-duration-micro: 0ms;
      --motion-duration-panel: 0ms;
      --motion-duration-shelf: 0ms;
    }
    /* Stacking contract — highest first; blocking overlays dismiss ephemeral chrome.
       map(0) < side-panel(2) < status-bar(5) < search-elevated(12) < map-tools(15) < chrome-popover(17)
       < modal(100) < login-modal(200) < toast(1000). (#302) */
    --z-map: 0;
    --z-side-panel: 2;
    --z-search-elevated: 12;
    --z-status-bar: 5;
    --z-map-tools: 15;
    --z-chrome-popover: 17;
    --z-modal: 100;
    --z-login-modal: 200;
    --z-toast: 1000;

    width: 100%;
    height: 100dvh;
    overflow: hidden;
  }

  .app-layout.edit-mode {
    /* Keep the mobile detail drawer peek above the measured edit dock. */
    --side-panel-bottom-inset: calc(
      var(--side-panel-bottom-inset-measured) +
        var(--side-panel-bottom-gap, 0.375rem) + var(--edit-bar-height, 0rem) +
        var(--bottom-fab-gap, 0.5rem)
    );
  }

  .inner-layer {
    display: flex;
    flex-direction: column;
    padding: var(--map-ui-padding, 0.5rem);
    padding-bottom: calc(0.5rem + env(safe-area-inset-bottom));
    flex: 1 0 0;
    min-height: 0;
    pointer-events: none;
    gap: 0.5rem;
  }

  .bottom-band {
    position: relative;
    z-index: var(--z-status-bar, 3);
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-end;
    flex-shrink: 0;
    width: 100%;
    pointer-events: none;
  }

  .bottom-chrome {
    position: relative;
    z-index: var(--z-status-bar, 3);
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
    gap: 0.5rem;
    width: 100%;
    min-width: 0;
    min-height: 2rem;
    box-sizing: border-box;
    /* Transparent shell so the bar hugs its content on the left and the
       location controls sit on the right — no full-width empty stretch. */
    pointer-events: none;
  }

  /* The bordered pill only wraps the left cluster (attribution + menu +
     status), so it no longer sprawls across the whole viewport. */
  .bottom-chrome__bar {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.375rem;
    flex: 0 1 auto;
    min-width: 0;
    min-height: 2rem;
    background-color: var(--map-chrome-surface, hsl(5 20% 97%));
    backdrop-filter: blur(10px);
    border: 1px solid var(--map-chrome-border, hsl(5 10% 68%));
    border-radius: var(--map-chrome-radius, 1rem);
    padding: 0.125rem 0.375rem;
    box-shadow: var(
      --map-chrome-panel-shadow,
      0 0 0 1px hsla(15, 8%, 20%, 0.16),
      0 2px 8px hsla(0, 0%, 0%, 0.14),
      0 8px 20px hsla(0, 0%, 0%, 0.18)
    );
    box-sizing: border-box;
    pointer-events: auto;
  }

  .bottom-chrome__leading {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    align-self: center;
    min-width: 0;
  }

  .bottom-chrome__status {
    display: flex;
    flex: 0 1 auto;
    align-items: center;
    min-width: 0;
    overflow: hidden;
  }

  .bottom-chrome__status :global(.status-bar) {
    width: 100%;
    max-width: 100%;
    margin: 0;
    align-self: stretch;
    border: none;
    background: transparent;
    box-shadow: none;
    backdrop-filter: none;
    border-radius: 0;
    padding: 0;
    min-height: 1.25rem;
  }

  .bottom-chrome__actions {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 0.125rem;
    min-height: 2.75rem;
    padding: 0.125rem;
    pointer-events: auto;
  }

  .bottom-band::before {
    content: "";
    position: absolute;
    /* Bleed through inner-layer padding so the fade reaches the viewport edge. */
    left: calc(-1 * var(--map-ui-padding, 0.5rem));
    right: calc(-1 * var(--map-ui-padding, 0.5rem));
    bottom: calc(
      -1 * (var(--map-ui-padding, 0.5rem) + env(safe-area-inset-bottom, 0px))
    );
    height: calc(
      6rem + var(--map-ui-padding, 0.5rem) + env(safe-area-inset-bottom, 0px)
    );
    background: linear-gradient(
      to top,
      var(--map-chrome-surface) 0%,
      var(--map-chrome-band-backdrop) 14%,
      hsla(5, 22%, 96%, 0.35) 54%,
      transparent 100%
    );
    pointer-events: none;
    z-index: 0;
  }

  :global(.map) {
    width: 100%;
    height: 100%;
  }

  .ui-layer {
    position: fixed;
    inset: 0;
    z-index: 10;
    pointer-events: none;
    display: flex;
  }

  .top-right-map-stack {
    position: absolute;
    top: calc(var(--map-ui-padding) + 2px);
    right: calc(var(--map-ui-padding) + 2px);
    z-index: var(--z-map-tools, 15);
    display: flex;
    width: min(22.5rem, calc(100% - 1rem));
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
    padding-top: 2px;
    padding-right: 2px;
    overflow: visible;
    pointer-events: none;
  }

  .desktop-camera-controls {
    display: none;
    pointer-events: none;
  }

  @media (min-width: 48.0625rem) {
    .desktop-camera-controls {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      pointer-events: none;
    }
  }

  .camera-controls-card {
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    box-sizing: border-box;
    gap: 0.125rem;
    padding: 0.1875rem;
    background-color: var(--map-chrome-surface, hsl(5 20% 97%));
    backdrop-filter: blur(10px);
    border: 1.5px solid var(--map-chrome-border, hsl(5 10% 68%));
    border-radius: var(--map-chrome-toggle-radius, 0.625rem);
    box-shadow: var(
      --map-chrome-shadow,
      0 0 0 1px hsla(0, 0%, 0%, 0.18),
      0 2px 6px hsla(0, 0%, 0%, 0.18),
      0 8px 20px hsla(0, 0%, 0%, 0.14)
    );
  }

  .camera-controls-card__divider {
    height: 2px;
    margin: 0.5rem 0.125rem;
    background-color: var(--map-chrome-divider, hsl(5 12% 70%));
  }

  @media (prefers-reduced-motion: reduce) {
    .app-layout {
      --motion-duration-fast: 0ms;
      --motion-duration-micro: 0ms;
      --motion-duration-panel: 0ms;
      --motion-duration-shelf: 0ms;
    }
  }

  @media (max-width: 48rem) {
    .app-layout {
      --map-ui-padding: 0.375rem;
      --map-search-inline-pad: 0.625rem;
      --bottom-fab-gap: 0.375rem;
      --bottom-chrome-gap: var(--bottom-fab-gap);
      --map-tools-block-height: 0px;
      --mobile-detail-sheet-top-inset: calc(
        var(--search-block-height) + var(--mobile-detail-sheet-gap, 0.375rem)
      );
      --bottom-fab-inset: 3.25rem;
    }

    .inner-layer {
      padding: 0;
      gap: 0;
    }

    .bottom-chrome {
      gap: 0.25rem;
      min-height: 2rem;
      padding: 0.125rem max(0.375rem, env(safe-area-inset-left, 0px))
        calc(0.125rem + env(safe-area-inset-bottom, 0px))
        max(0.375rem, env(safe-area-inset-right, 0px));
      border-radius: 0;
      border-left: none;
      border-right: none;
      border-bottom: none;
      backdrop-filter: none;
    }

    .bottom-chrome__status :global(.status-bar) {
      min-height: 1.25rem;
      padding-bottom: 0;
    }

    .bottom-chrome__leading {
      padding-left: max(0.125rem, env(safe-area-inset-left, 0px));
    }

    .top-right-map-stack {
      position: fixed;
      inset: 0;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: auto;
      pointer-events: none;
      z-index: 16;
    }

    .top-right-map-stack :global(.map-chrome-fab-trigger) {
      display: none;
    }

    .top-right-map-stack :global(.map-chrome-panel) {
      position: fixed;
      /* Float below the search block with a gap, inset + rounded to match the
         search chrome, instead of butting edge-to-edge against the top bar. */
      top: calc(var(--search-block-height) + var(--map-ui-padding, 0.375rem));
      right: var(--map-ui-padding, 0.375rem);
      left: var(--map-ui-padding, 0.375rem);
      width: auto;
      max-width: none;
      max-height: calc(
        100dvh - var(--search-block-height) - var(--map-ui-padding, 0.375rem) -
          var(--status-bar-block-height)
      );
      margin: 0;
      pointer-events: auto;
    }

    .top-right-map-stack :global(.map-tools-panel) {
      /* Hug content; scroll inside when a section is expanded. */
      min-height: 0;
      max-height: min(
        42dvh,
        calc(
          100dvh - var(--search-block-height) -
            var(--map-ui-padding, 0.375rem) - var(--status-bar-block-height) -
            0.5rem
        )
      );
      padding: 0.5rem 0.625rem;
      gap: 0.375rem;
    }

    .top-right-map-stack :global(.map-tools-panel .map-chrome-panel-header) {
      font-size: 0.875rem;
      padding: 0.125rem 0.125rem 0.375rem;
    }

    .top-right-map-stack :global(.map-tools-panel .map-chrome-panel-close) {
      width: 2.25rem;
      height: 2.25rem;
    }

    .top-right-map-stack :global(.map-tools-panel .map-chrome-panel-body) {
      flex: 0 1 auto;
      min-height: 0;
      gap: 0.25rem;
      overflow-y: auto;
      overscroll-behavior: contain;
    }

    .top-right-map-stack
      :global(.map-tools-panel .map-chrome-accordion-toggle) {
      min-height: 2.125rem;
      padding: 0.375rem 0.5rem;
      font-size: 0.8125rem;
    }

    .top-right-map-stack :global(.map-tools-panel .map-chrome-accordion-body) {
      padding: 0.125rem 0 0.3125rem;
    }
  }
</style>
