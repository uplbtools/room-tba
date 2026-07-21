<script lang="ts">
  import Menu from "@lucide/svelte/icons/menu";
  import Keyboard from "@lucide/svelte/icons/keyboard";
  import ChartColumn from "@lucide/svelte/icons/chart-column";
  import FileText from "@lucide/svelte/icons/file-text";
  import LifeBuoy from "@lucide/svelte/icons/life-buoy";
  import CircleHelp from "@lucide/svelte/icons/circle-help";
  import Inbox from "@lucide/svelte/icons/inbox";
  import { onMount } from "svelte";
  import { formatCatalogUpdatedDate } from "@constants/data-catalog";
  import { APP_VERSION_LABEL } from "@constants/version";
  import { statusBarNavGroups } from "@constants/status-bar-links";
  import { trapFocus } from "@lib/focus-trap";
  import { openShortcutsHelp } from "@lib/keyboard-shortcuts";
  import { portal } from "@lib/portal";
  import {
    registerEphemeralOverlayDismisser,
    openEphemeralOverlay,
  } from "@lib/overlay-stack";
  import { rafThrottle } from "@lib/layout-css-vars";
  import {
    adminAuthStore,
    mapToolsStore,
    modalStore,
    proposalsStore,
  } from "@lib/store.svelte";
  import OfflineMaps from "@ui/OfflineMaps.svelte";
  import SyncStatus from "@ui/SyncStatus.svelte";
  import PWAInstallPrompt from "@ui/PWAInstallPrompt.svelte";
  import MapChromeSession from "@ui/map-chrome/MapChromeSession.svelte";
  import KeyboardShortcutsChip from "@ui/map-chrome/KeyboardShortcutsPopup.svelte";
  import StatusBarLinkGroups from "./StatusBarLinkGroups.svelte";
  import "../map-chrome/map-chrome.css";

  type Props = {
    onSignOut: () => void | Promise<void>;
  };

  const { onSignOut }: Props = $props();

  let open = $state(false);
  let triggerEl = $state<HTMLButtonElement | null>(null);
  let panelEl = $state<HTMLDivElement | null>(null);
  let panelStyle = $state("");

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
  const catalogUpdatedLabel = formatCatalogUpdatedDate();
  const navGroups = $derived(
    statusBarNavGroups({
      versionLabel: APP_VERSION_LABEL,
      showEditorLogin: !adminAuthStore.isLoggedIn,
    }),
  );

  onMount(() => {
    const unregisterDismiss = registerEphemeralOverlayDismisser(() => {
      open = false;
    });
    return unregisterDismiss;
  });

  function updatePanelPosition() {
    if (!open || !triggerEl) return;
    const rect = triggerEl.getBoundingClientRect();
    const width = Math.min(22 * 16, window.innerWidth - 16);
    const left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - width - 8,
    );
    const bottom = Math.max(8, window.innerHeight - rect.top + 8);
    panelStyle = `left: ${left}px; bottom: ${bottom}px; width: ${width}px;`;
  }

  $effect(() => {
    if (!open) return;
    updatePanelPosition();
    const handleLayout = rafThrottle(updatePanelPosition);
    window.addEventListener("resize", handleLayout);
    window.addEventListener("scroll", handleLayout, true);
    return () => {
      window.removeEventListener("resize", handleLayout);
      window.removeEventListener("scroll", handleLayout, true);
    };
  });

  function toggleOpen() {
    if (!open) {
      openEphemeralOverlay(() => {
        mapToolsStore.close();
        open = true;
        queueMicrotask(updatePanelPosition);
      });
      return;
    }
    open = false;
  }

  function closePanel() {
    open = false;
  }

  $effect(() => {
    if (!open || !panelEl) return;
    return trapFocus(panelEl, { onEscape: closePanel });
  });

  function handleDocumentPointerDown(event: PointerEvent) {
    if (!open) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (triggerEl?.contains(target)) return;
    if (panelEl?.contains(target)) return;
    if (target instanceof Element && target.closest("#offline-maps-dialog")) {
      return;
    }
    closePanel();
  }

  function handleNavAction(
    id: "contributors" | "editor-login" | "leaderboard" | "sign-up",
  ) {
    if (id === "contributors") {
      modalStore.openModal("landing", { landingTab: "campus" });
      closePanel();
      return;
    }
    if (id === "leaderboard") {
      modalStore.openModal("leaderboard");
      closePanel();
      return;
    }
    adminAuthStore.openLogin(id === "sign-up" ? "signup" : "signin");
    closePanel();
  }

  function handleShortcutsHelp() {
    closePanel();
    openShortcutsHelp();
  }

  function handleWhatsNew() {
    closePanel();
    modalStore.openModal("changelog");
  }

  function handleCoverage() {
    closePanel();
    modalStore.openModal("coverage");
  }

  function handleHowItWorks() {
    closePanel();
    modalStore.openModal("landing", { landingTab: "welcome" });
  }

  function handleReview() {
    closePanel();
    modalStore.openModal("review");
  }
</script>

<svelte:window onpointerdown={handleDocumentPointerDown} />

<div class="app-menu">
  <button
    bind:this={triggerEl}
    type="button"
    class="app-menu__trigger map-chrome-chip"
    aria-expanded={open}
    aria-haspopup="dialog"
    aria-controls="app-menu-panel"
    aria-label="App menu"
    onclick={toggleOpen}
  >
    <Menu size={14} aria-hidden="true" />
    <span>Menu</span></button
  >

  <div class="app-menu__shortcuts-host" aria-hidden="true">
    <KeyboardShortcutsChip compact />
  </div>

  {#if open}
    <div
      bind:this={panelEl}
      id="app-menu-panel"
      class="app-menu__panel map-chrome-popover"
      style={panelStyle}
      role="dialog"
      aria-modal="true"
      aria-label="App menu"
      use:portal
    >
      {#if contributorSession}
        <section class="app-menu__section" aria-label="Signed in">
          <MapChromeSession
            roleLabel={sessionRoleLabel}
            displayName={sessionDisplayName}
            utilities
            {onSignOut}
          />
        </section>
      {/if}

      {#if adminAuthStore.canReview}
        <section class="app-menu__section" aria-label="Review">
          <button
            type="button"
            class="app-menu__action map-chrome-chip"
            onclick={handleReview}
          >
            <Inbox size={14} aria-hidden="true" />
            <span>
              Review suggested edits
              {#if proposalsStore.pendingCount > 0}
                <span class="app-menu__badge"
                  >{proposalsStore.pendingCount}</span
                >
              {/if}
            </span>
          </button>
        </section>
      {/if}

      <section
        class="app-menu__section"
        aria-labelledby="app-menu-data-heading"
      >
        <h3 id="app-menu-data-heading" class="app-menu__heading">Data</h3>
        <div class="app-menu__sync"></div>
        <div class="app-menu__offline">
          <OfflineMaps compact={false} />
        </div>
        <button
          type="button"
          class="app-menu__action map-chrome-chip"
          onclick={handleCoverage}
        >
          <ChartColumn size={14} aria-hidden="true" />
          <span>Campus data coverage</span>
        </button>
        <p class="app-menu__meta">Updated {catalogUpdatedLabel}</p>
      </section>

      <section
        class="app-menu__section"
        aria-labelledby="app-menu-links-heading"
      >
        <h3 id="app-menu-links-heading" class="app-menu__heading">Links</h3>
        <nav aria-label="App links">
          <StatusBarLinkGroups groups={navGroups} onAction={handleNavAction} />
        </nav>
      </section>

      <section
        class="app-menu__section"
        aria-labelledby="app-menu-help-heading"
      >
        <h3 id="app-menu-help-heading" class="app-menu__heading">Help</h3>
        <a
          class="app-menu__action map-chrome-chip"
          href="/faq"
          onclick={closePanel}
        >
          <CircleHelp size={14} aria-hidden="true" />
          <span>Help &amp; FAQ</span>
        </a>
        <button
          type="button"
          class="app-menu__action map-chrome-chip"
          onclick={handleHowItWorks}
        >
          <LifeBuoy size={14} aria-hidden="true" />
          <span>How Room TBA works</span>
        </button>
        <button
          type="button"
          class="app-menu__action map-chrome-chip"
          onclick={handleWhatsNew}
        >
          <FileText size={14} aria-hidden="true" />
          <span>What's new</span>
        </button>
        <button
          type="button"
          class="app-menu__action map-chrome-chip"
          aria-keyshortcuts="?"
          onclick={handleShortcutsHelp}
        >
          <Keyboard size={14} aria-hidden="true" />
          <span>Keyboard shortcuts</span>
        </button>
      </section>

      <section
        class="app-menu__section app-menu__section--install"
        aria-label="Install app"
      >
        <PWAInstallPrompt />
      </section>
    </div>
  {/if}
</div>

<style>
  .app-menu {
    position: relative;
    display: inline-flex;
    flex-shrink: 0;
  }

  .app-menu__trigger {
    cursor: pointer;
  }

  .app-menu__shortcuts-host {
    position: absolute;
    left: 0;
    bottom: 100%;
    width: 0;
    height: 0;
    overflow: visible;
    opacity: 0;
    pointer-events: none;
  }

  .app-menu__shortcuts-host :global(.shortcuts-chip__trigger) {
    position: fixed;
    left: var(--map-ui-padding, 0.5rem);
    bottom: calc(var(--status-bar-block-height, 2.75rem) + 0.25rem);
  }

  .app-menu__action {
    align-self: flex-start;
    cursor: pointer;
    text-decoration: none;
  }

  .app-menu__badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.1rem;
    margin-left: 0.25rem;
    padding: 0 0.3rem;
    border-radius: 999px;
    background: hsl(5, 53%, 32%);
    color: white;
    font-size: 0.6875rem;
    font-weight: 700;
  }

  .app-menu__panel {
    position: fixed;
    z-index: var(--z-chrome-popover, 17);
    border-radius: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: min(70vh, 28rem);
    overflow-y: auto;
    padding: 0.75rem;
  }

  .app-menu__section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-top: 0.25rem;
    border-top: 1px solid var(--map-chrome-divider, hsl(5 12% 88%));
  }

  .app-menu__section:first-child {
    border-top: none;
    padding-top: 0;
  }

  .app-menu__heading {
    margin: 0;
    font: inherit;
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: hsl(0, 0%, 40%);
  }

  .app-menu__meta {
    margin: 0;
    font-size: 0.6875rem;
    color: hsl(0, 0%, 42%);
  }

  .app-menu__sync :global(.sync-status--inline) {
    width: 100%;
  }

  .app-menu__offline :global(.offline-maps) {
    width: 100%;
  }

  .app-menu__section--install :global(.pwa-install-prompt) {
    max-width: none;
    width: 100%;
  }

  .app-menu__section--install:not(:has(:global(.pwa-install-prompt))) {
    display: none;
  }

  .app-menu__section :global(.status-bar__nav-group) {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 0.5rem;
  }

  .app-menu__section :global(.status-bar__nav-group + .status-bar__nav-group) {
    margin-top: 0.25rem;
    padding-top: 0.375rem;
    border-top: 1px dashed hsl(0, 0%, 88%);
  }
</style>
