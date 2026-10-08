<script lang="ts">
  import Menu from "@lucide/svelte/icons/menu";
  import SettingsIcon from "@lucide/svelte/icons/settings";
  import Keyboard from "@lucide/svelte/icons/keyboard";
  import ChartColumn from "@lucide/svelte/icons/chart-column";
  import FileText from "@lucide/svelte/icons/file-text";
  import LifeBuoy from "@lucide/svelte/icons/life-buoy";
  import CircleHelp from "@lucide/svelte/icons/circle-help";
  import Inbox from "@lucide/svelte/icons/inbox";
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import CalendarClock from "@lucide/svelte/icons/calendar-clock";
  import ClipboardPenLine from "@lucide/svelte/icons/clipboard-pen-line";
  import CloudDownload from "@lucide/svelte/icons/cloud-download";
  import Megaphone from "@lucide/svelte/icons/megaphone";
  import MessageSquare from "@lucide/svelte/icons/message-square";
  import UserRound from "@lucide/svelte/icons/user-round";
  import Phone from "@lucide/svelte/icons/phone";
  import University from "@lucide/svelte/icons/university";
  import Users from "@lucide/svelte/icons/users";
  import BookText from "@lucide/svelte/icons/book-text";
  import Star from "@lucide/svelte/icons/star";
  import { onMount, type Component } from "svelte";
  import { fade, fly } from "svelte/transition";
  import { MediaQuery } from "svelte/reactivity";
  import { APP_VERSION_LABEL } from "@constants/version";
  import OnlineCounter from "../OnlineCounter.svelte";
  import {
    STATUS_BAR_LEGAL_LINKS,
    statusBarNavGroups,
  } from "@constants/status-bar-links";
  import { trapFocus } from "@lib/focus-trap";
  import { openShortcutsHelp } from "@lib/keyboard-shortcuts";
  import { openBrowseClasses, openCampusBrowse } from "@lib/browse-campus";
  import { overlayFade, panelDismiss, panelReveal } from "@lib/motion";
  import { portal } from "@lib/portal";
  import {
    registerEphemeralOverlayDismisser,
    openEphemeralOverlay,
  } from "@lib/overlay-stack";
  import { rafThrottle } from "@lib/layout-css-vars";
  import { trackOverlay } from "@lib/track-overlay.svelte";
  import {
    adminAuthStore,
    announcementsStore,
    mapToolsStore,
    modalStore,
    proposalsStore,
    queryStore,
    sidePanelStore,
    sidebarStore,
    toastStore,
  } from "@lib/store.svelte";
  import PWAInstallPrompt from "@ui/PWAInstallPrompt.svelte";
  import MapChromeSession from "@ui/map-chrome/MapChromeSession.svelte";
  import KeyboardShortcutsChip from "@ui/map-chrome/KeyboardShortcutsPopup.svelte";
  import StatusBarLinkGroups from "./StatusBarLinkGroups.svelte";
  import "../map-chrome/map-chrome.css";

  type ScreenId = "today" | "planner" | "finals" | "calendar";

  type Props = {
    /** Optional so the menu can be dropped into any chrome without each host
        re-implementing sign-out. */
    onSignOut?: () => void | Promise<void>;
    /** Bindable so the host can mute its own active-tab highlight while the
        menu is open (one "you are here" at a time). */
    open?: boolean;
    /** Screens the host chrome already shows as tabs. The menu leaves them out
        instead of listing every destination twice. */
    hostTabs?: readonly (ScreenId | "map")[];
    /** False when the host already shows its own Sign in / Account button. */
    showAccount?: boolean;
  };

  let {
    onSignOut = defaultSignOut,
    open = $bindable(false),
    hostTabs = [],
    showAccount = true,
  }: Props = $props();

  const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");

  /** The map itself is never listed: every host has a Map tab or home button. */
  const SCREENS: { id: ScreenId; label: string; icon: Component }[] = [
    { id: "today", label: "Today", icon: CalendarClock },
    { id: "planner", label: "Course planner", icon: ClipboardPenLine },
    { id: "finals", label: "Final exams", icon: FileText },
    { id: "calendar", label: "Academic calendar", icon: CalendarDays },
  ];
  const screens = $derived(SCREENS.filter((s) => !hostTabs.includes(s.id)));

  async function defaultSignOut() {
    await adminAuthStore.logout();
    toastStore.show("Signed out.", "info");
  }

  function handleScreen(id: ScreenId) {
    sidebarStore.changeOpened(id);
    closePanel();
  }

  function handleSignIn() {
    if (adminAuthStore.username) {
      adminAuthStore.openAccountSettings();
    } else {
      adminAuthStore.openLogin("signin");
    }
    closePanel();
  }

  let triggerEl = $state<HTMLButtonElement | null>(null);
  let panelEl = $state<HTMLDivElement | null>(null);
  let panelStyle = $state("");
  /** Sheet rising from a bottom bar (phones) vs dropdown from a top bar. */
  let fromBottom = $state(true);
  /** More menu below the fold: fade the bottom edge so it reads as scrollable. */
  let moreBelow = $state(false);

  function syncMoreBelow() {
    const el = panelEl;
    moreBelow = !!el && el.scrollTop + el.clientHeight < el.scrollHeight - 4;
  }

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
  const navGroups = statusBarNavGroups();

  onMount(() => {
    const unregisterDismiss = registerEphemeralOverlayDismisser(() => {
      open = false;
    });
    return unregisterDismiss;
  });

  function updatePanelPosition() {
    if (!open || !triggerEl) return;
    const rect = triggerEl.getBoundingClientRect();
    // Anchor away from whichever edge the trigger sits against. Fixed `bottom`
    // is right for a bottom bar but throws the panel off the top of the screen
    // when the trigger lives in the desktop top bar.
    fromBottom = rect.top >= window.innerHeight / 2;
    if (!fromBottom) {
      const width = Math.min(22 * 16, window.innerWidth - 16);
      const left = Math.min(
        Math.max(8, rect.left),
        window.innerWidth - width - 8,
      );
      const top = Math.min(rect.bottom + 8, window.innerHeight - 8);
      panelStyle = `left: ${left}px; top: ${top}px; bottom: auto; max-height: ${Math.max(120, window.innerHeight - top - 8)}px; width: ${width}px;`;
      return;
    }
    // Bottom bar (phones): a centred, near-full-height sheet that stops 8px
    // above the bar, measured from the highest thing the bar paints (the add
    // FAB overhangs the bar's top edge), so no row scrolls under it.
    const bar = triggerEl.closest("nav") ?? triggerEl;
    const barTop = Math.min(
      bar.getBoundingClientRect().top,
      ...[...bar.children].map((el) => el.getBoundingClientRect().top),
    );
    const bottom = Math.max(8, window.innerHeight - barTop + 8);
    const width = Math.min(32 * 16, window.innerWidth - 16);
    const left = Math.round((window.innerWidth - width) / 2);
    panelStyle = `left: ${left}px; width: ${width}px; bottom: ${bottom}px; top: max(8px, env(safe-area-inset-top, 0px)); max-height: none;`;
    requestAnimationFrame(syncMoreBelow);
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

  // Back closes the menu instead of leaving the app.
  trackOverlay("menu", () => open, closePanel);

  // Focus the panel itself, not its first row: a tap-opened menu should not
  // paint a focus ring (or a "selected" look) on whichever row comes first.
  $effect(() => {
    if (!open || !panelEl) return;
    return trapFocus(panelEl, { onEscape: closePanel, initialFocus: panelEl });
  });

  function handleNavAction(id: "contributors" | "leaderboard") {
    if (id === "leaderboard") {
      modalStore.openModal("leaderboard");
    } else {
      modalStore.openModal("landing", { landingTab: "campus" });
    }
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

  function handleSettings() {
    closePanel();
    modalStore.openModal("settings");
  }

  function handleCoverage() {
    closePanel();
    modalStore.openModal("coverage");
  }

  function handleBrowse(id: "colleges" | "organizations" | "classes") {
    if (id === "classes") {
      openBrowseClasses(queryStore, sidePanelStore);
    } else {
      openCampusBrowse(queryStore, sidePanelStore, id);
    }
    closePanel();
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
    <!-- Modal scrim: a tap outside only closes the menu; it never also lands
         on the map, search or a tab underneath. Keyboard users close with
         Escape (focus trap), so the scrim needs no key handler. -->
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div
      class="app-menu__scrim"
      aria-hidden="true"
      onclick={closePanel}
      use:portal
      transition:fade={overlayFade(reducedMotion.current)}
    ></div>
    <div
      bind:this={panelEl}
      id="app-menu-panel"
      class="app-menu__panel map-chrome-popover"
      class:app-menu__panel--more-below={moreBelow}
      style={panelStyle}
      onscroll={syncMoreBelow}
      role="dialog"
      aria-modal="true"
      aria-label="App menu"
      tabindex="-1"
      use:portal
      in:fly={panelReveal(reducedMotion.current, fromBottom ? 24 : -8)}
      out:fly={panelDismiss(reducedMotion.current, fromBottom ? 16 : -6)}
    >
      {#if contributorSession}
        <section class="app-menu__account" aria-label="Signed in">
          <MapChromeSession
            roleLabel={sessionRoleLabel}
            displayName={sessionDisplayName}
            utilities
            {onSignOut}
          />
        </section>
      {:else if showAccount}
        <section class="app-menu__section" aria-label="Account">
          <button
            type="button"
            class="app-menu__nav-action"
            onclick={handleSignIn}
          >
            <UserRound size={18} aria-hidden="true" />
            <span>
              {adminAuthStore.username ? "Account settings" : "Sign in"}
            </span>
          </button>
        </section>
      {/if}

      <section
        class="app-menu__section"
        aria-labelledby="app-menu-go-heading"
      >
        <h3 id="app-menu-go-heading" class="app-menu__heading">Go to</h3>
        <button
          type="button"
          class="app-menu__nav-action"
          onclick={() => {
            closePanel();
            modalStore.openModal("saved-places");
          }}
        >
          <Star size={18} aria-hidden="true" />
          <span>Saved</span>
        </button>
        {#each screens as screen (screen.id)}
          {@const Icon = screen.icon}
          <button
            type="button"
            class="app-menu__nav-action"
            aria-current={sidebarStore.panelOpen === screen.id
              ? "page"
              : undefined}
            onclick={() => handleScreen(screen.id)}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{screen.label}</span>
          </button>
        {/each}
        <button
          type="button"
          class="app-menu__nav-action"
          onclick={() => {
            closePanel();
            modalStore.openModal("announcements");
          }}
        >
          <Megaphone size={18} aria-hidden="true" />
          <span>
            Announcements
            {#if announcementsStore.unread > 0}
              <span class="app-menu__badge">{announcementsStore.unread}</span>
            {/if}
          </span>
        </button>
      </section>

      <section
        class="app-menu__section"
        aria-labelledby="app-menu-tools-heading"
      >
        <h3 id="app-menu-tools-heading" class="app-menu__heading">Tools</h3>
        <button
          type="button"
          class="app-menu__nav-action"
          onclick={() => {
            closePanel();
            modalStore.openModal("feedback");
          }}
        >
          <MessageSquare size={18} aria-hidden="true" />
          <span>Send feedback</span>
        </button>
        <button
          type="button"
          class="app-menu__nav-action"
          onclick={() => {
            closePanel();
            modalStore.openModal("hotlines");
          }}
        >
          <Phone size={18} aria-hidden="true" />
          <span>Emergency hotlines</span>
        </button>
        <button
          type="button"
          class="app-menu__nav-action"
          onclick={handleSettings}
        >
          <SettingsIcon size={18} aria-hidden="true" />
          <span>Settings</span>
        </button>
        <button
          type="button"
          class="app-menu__nav-action"
          onclick={() => {
            closePanel();
            modalStore.openModal("offline-maps");
          }}
        >
          <CloudDownload size={18} aria-hidden="true" />
          <span>Offline maps</span>
        </button>
      </section>

      <section
        class="app-menu__section"
        aria-labelledby="app-menu-browse-heading"
      >
        <h3 id="app-menu-browse-heading" class="app-menu__heading">Browse</h3>
        <button
          type="button"
          class="app-menu__nav-action"
          onclick={() => handleBrowse("colleges")}
        >
          <University size={18} aria-hidden="true" />
          <span>Colleges</span>
        </button>
        <button
          type="button"
          class="app-menu__nav-action"
          onclick={() => handleBrowse("organizations")}
        >
          <Users size={18} aria-hidden="true" />
          <span>Student organizations</span>
        </button>
        <button
          type="button"
          class="app-menu__nav-action"
          onclick={() => handleBrowse("classes")}
        >
          <BookText size={18} aria-hidden="true" />
          <span>Classes</span>
        </button>
      </section>

      {#if adminAuthStore.canReview}
        <section class="app-menu__section" aria-label="Review">
          <button
            type="button"
            class="app-menu__nav-action"
            onclick={handleReview}
          >
            <Inbox size={18} aria-hidden="true" />
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
        aria-labelledby="app-menu-help-heading"
      >
        <h3 id="app-menu-help-heading" class="app-menu__heading">Help</h3>
        <a class="app-menu__nav-action" href="/faq" onclick={closePanel}>
          <CircleHelp size={18} aria-hidden="true" />
          <span>Help &amp; FAQ</span>
        </a>
        <button
          type="button"
          class="app-menu__nav-action"
          onclick={handleHowItWorks}
        >
          <LifeBuoy size={18} aria-hidden="true" />
          <span>How Room TBA works</span>
        </button>
        <button
          type="button"
          class="app-menu__nav-action"
          onclick={handleWhatsNew}
        >
          <FileText size={18} aria-hidden="true" />
          <span>What's new</span>
        </button>
        <button
          type="button"
          class="app-menu__nav-action app-menu__shortcuts-entry"
          aria-keyshortcuts="?"
          onclick={handleShortcutsHelp}
        >
          <Keyboard size={18} aria-hidden="true" />
          <span>Keyboard shortcuts</span>
        </button>
      </section>

      <section
        class="app-menu__section"
        aria-labelledby="app-menu-community-heading"
      >
        <h3 id="app-menu-community-heading" class="app-menu__heading">
          Community
        </h3>
        <!-- A contributor's view of what is still unmapped, so it sits with
             the community links rather than the student tools. -->
        <button
          type="button"
          class="app-menu__nav-action"
          onclick={handleCoverage}
        >
          <ChartColumn size={18} aria-hidden="true" />
          <span>Campus data coverage</span>
        </button>
        <nav aria-label="Community and project links">
          <StatusBarLinkGroups groups={navGroups} onAction={handleNavAction} />
        </nav>
      </section>

      <section
        class="app-menu__section app-menu__section--install"
        aria-label="Install app"
      >
        <PWAInstallPrompt />
      </section>

      <!-- Passive status lives at the bottom, next to the version: it is not
           something to act on, so it should not take the first row. -->
      <footer class="app-menu__footer">
        <OnlineCounter />
        <span class="app-menu__footer-links">
          <span>{APP_VERSION_LABEL}</span>
          {#each STATUS_BAR_LEGAL_LINKS as link (link.href)}
            <a href={link.href}>{link.label}</a>
          {/each}
        </span>
      </footer>
    </div>
  {/if}
</div>

<style>
  .app-menu__account {
    display: flex;
    min-width: 0;
    padding: 0.25rem 0.75rem 0.5rem;
  }

  /* Signed-in row: drop the action icons and let the role chip truncate. */
  .app-menu__account :global(.map-chrome-session--utilities) {
    flex-wrap: nowrap;
  }

  .app-menu__account :global(.map-chrome-ghost-btn svg) {
    display: none;
  }

  .app-menu__account :global(.map-chrome-session-chip) {
    flex-shrink: 1;
    min-width: 0;
  }

  .app-menu__account :global(.map-chrome-session-chip svg) {
    flex-shrink: 0;
  }

  .app-menu__account :global(.map-chrome-session-chip > span) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

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

  /* One row style for every entry, including the community rows rendered by
     StatusBarLinkGroups (hence :global). 44px touch target, no gaps. */
  .app-menu__panel :global(.app-menu__nav-action) {
    /* No global border-box reset in this app: without this, min-height +
       padding stack to 64px-tall rows and width: 100% + padding overflows
       the panel sideways (stray horizontal scrollbar). */
    box-sizing: border-box;
    width: 100%;
    min-height: 2.75rem;
    margin: 0;
    border: 0;
    border-radius: 0.5rem;
    padding: 0.5rem 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: transparent;
    color: var(--map-chrome-text, var(--theme-text, hsl(5 20% 18%)));
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.15;
    text-align: left;
    text-decoration: none;
    cursor: pointer;
  }

  .app-menu__panel :global(.app-menu__nav-action > svg) {
    flex-shrink: 0;
  }

  /* Hover only where a pointer can hover: on touch, :hover sticks to the
     last tapped row. */
  @media (hover: hover) {
    .app-menu__panel :global(.app-menu__nav-action:hover) {
      background: var(--map-chrome-hover, var(--theme-accent-soft, hsl(5 25% 96%)));
    }
  }

  .app-menu__panel :global(.app-menu__nav-action:active) {
    background: var(--map-chrome-hover, var(--theme-accent-soft, hsl(5 25% 96%)));
  }

  .app-menu__panel :global(.app-menu__nav-action[aria-current="page"]) {
    background: var(--theme-accent-soft, #feeaea);
    color: var(--theme-accent-text, #8d1437);
  }

  .app-menu__panel :global(.app-menu__nav-action:focus-visible) {
    outline: 2px solid var(--color-brand, var(--theme-accent-text, hsl(345 75% 31%)));
    outline-offset: -2px;
  }

  /* No physical keyboard on touch-only devices: the entry is noise there. */
  @media (hover: none) {
    .app-menu__panel .app-menu__shortcuts-entry {
      display: none;
    }
  }

  .app-menu__badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.1rem;
    margin-left: 0.25rem;
    padding: 0 0.3rem;
    border-radius: 999px;
    background: var(--theme-accent-fill, hsl(5, 53%, 32%));
    color: white;
    font-size: 0.6875rem;
    font-weight: 700;
  }

  .app-menu__scrim {
    position: fixed;
    inset: 0;
    z-index: var(--z-chrome-popover, 17);
    background: rgb(20 12 14 / 0.32);
  }

  .app-menu__panel {
    position: fixed;
    z-index: var(--z-chrome-popover, 17);
    box-sizing: border-box;
    border-radius: 0.875rem;
    display: flex;
    flex-direction: column;
    gap: 0;
    max-height: min(70vh, 28rem);
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 0.5rem;
  }

  .app-menu__panel:focus {
    outline: none;
  }

  /* A fade pinned to the panel's bottom edge while more items are below, in
     the panel's own surface colour (a mask would fade the surface too and
     let the map show through). */
  .app-menu__panel--more-below::after {
    content: "";
    position: sticky;
    bottom: -0.5rem;
    flex: 0 0 3.5rem;
    margin: -3.5rem -0.5rem -0.5rem;
    background: linear-gradient(
      to bottom,
      transparent,
      var(--map-chrome-surface, var(--theme-surface, rgba(255, 255, 255, 0.98))) 85%
    );
    pointer-events: none;
  }

  .app-menu__section {
    display: flex;
    flex-direction: column;
    padding: 0.25rem 0;
    border-top: 1px solid var(--map-chrome-divider, var(--theme-accent-border, hsl(5 12% 88%)));
  }

  .app-menu__section:first-child,
  .app-menu__account:first-child {
    border-top: none;
    padding-top: 0;
  }

  .app-menu__heading {
    margin: 0;
    padding: 0.5rem 0.75rem 0.25rem;
    font: inherit;
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--theme-text-2, hsl(0, 0%, 40%));
  }

  .app-menu__section--install :global(.pwa-install-prompt) {
    max-width: none;
    width: 100%;
  }

  .app-menu__section--install:not(:has(:global(.pwa-install-prompt))) {
    display: none;
  }

  .app-menu__footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.25rem 0.75rem;
    padding: 0.5rem 0.75rem 0.25rem;
    border-top: 1px solid var(--map-chrome-divider, var(--theme-accent-border, hsl(5 12% 88%)));
    font-size: 0.75rem;
    color: var(--theme-text-2, hsl(0, 0%, 40%));
  }

  .app-menu__footer :global(.online-counter) {
    height: auto;
    padding: 0;
    border: 0;
    background: none;
    box-shadow: none;
    font-size: 0.75rem;
    font-weight: 500;
    color: inherit;
  }

  .app-menu__footer-links {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0 0.75rem;
    margin-left: auto;
  }

  .app-menu__footer-links a {
    display: inline-flex;
    align-items: center;
    min-height: 2.75rem;
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
</style>
