<script lang="ts">
  import UserRound from "@lucide/svelte/icons/user-round";
  import LogOut from "@lucide/svelte/icons/log-out";
  import SettingsIcon from "@lucide/svelte/icons/settings";
  import Keyboard from "@lucide/svelte/icons/keyboard";
  import ChartColumn from "@lucide/svelte/icons/chart-column";
  import FileText from "@lucide/svelte/icons/file-text";
  import LifeBuoy from "@lucide/svelte/icons/life-buoy";
  import CircleHelp from "@lucide/svelte/icons/circle-help";
  import BookOpen from "@lucide/svelte/icons/book-open";
  import Inbox from "@lucide/svelte/icons/inbox";
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import CalendarClock from "@lucide/svelte/icons/calendar-clock";
  import ClipboardPenLine from "@lucide/svelte/icons/clipboard-pen-line";
  import CloudDownload from "@lucide/svelte/icons/cloud-download";
  import Megaphone from "@lucide/svelte/icons/megaphone";
  import MessageSquare from "@lucide/svelte/icons/message-square";
  import MessagesSquare from "@lucide/svelte/icons/messages-square";
  import Phone from "@lucide/svelte/icons/phone";
  import Printer from "@lucide/svelte/icons/printer";
  import Users from "@lucide/svelte/icons/users";
  import Star from "@lucide/svelte/icons/star";
  import Trophy from "@lucide/svelte/icons/trophy";
  import PencilLine from "@lucide/svelte/icons/pencil-line";
  import Globe from "@lucide/svelte/icons/globe";
  import Info from "@lucide/svelte/icons/info";
  import Shield from "@lucide/svelte/icons/shield";
  import Scale from "@lucide/svelte/icons/scale";
  import { onMount, tick } from "svelte";
  import { fade, fly } from "svelte/transition";
  import { MediaQuery } from "svelte/reactivity";
  import { APP_VERSION_LABEL } from "@constants/version";
  import {
    DISCORD_URL,
    MESSENGER_CONTRIBUTE_TARGET,
    UPLB_TOOLS_URL,
  } from "@constants/community-links";
  import OnlineCounter from "../OnlineCounter.svelte";
  import Avatar from "../Avatar.svelte";
  import { trapFocus } from "@lib/focus-trap";
  import { openShortcutsHelp } from "@lib/keyboard-shortcuts";
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
    sidebarStore,
    toastStore,
  } from "@lib/store.svelte";
  import { campusTransit } from "../../../campus.config";
  import PWAInstallPrompt from "@ui/PWAInstallPrompt.svelte";
  import ModalHeader from "@ui/modal/ModalHeader.svelte";
  import SettingsRow from "@ui/modal/SettingsRow.svelte";
  import SettingsSection from "@ui/modal/SettingsSection.svelte";
  import SettingsModal from "@ui/modal/SettingsModal.svelte";
  import SavedPlacesModal from "@ui/modal/SavedPlacesModal.svelte";
  import OfflineMapsModal from "@ui/modal/OfflineMapsModal.svelte";
  import ContributorsModal from "@ui/modal/ContributorsModal.svelte";
  import { setSheetContext } from "@ui/modal/sheet-context";
  import "../map-chrome/map-chrome.css";

  /**
   * You: the account and everything that is not a primary tab, like the
   * "You" tab of Google Maps. A full-height sheet above the bottom bar on
   * phones, a dropdown from the avatar in the desktop top bar; the same
   * entries either way, minus whatever the host bar already shows.
   *
   * Saved, Offline maps & storage, Settings and Contributors push inside the
   * sheet with a back arrow; Back and Escape pop one level, the X closes it.
   */

  type ScreenId = "today" | "planner" | "finals" | "calendar";
  type SubScreen = "root" | "saved" | "storage" | "settings" | "contributors";

  type Props = {
    /** Optional so the menu can be dropped into any chrome without each host
        re-implementing sign-out. */
    onSignOut?: () => void | Promise<void>;
    /** Bindable so the host can mute its own active-tab highlight while the
        sheet is open (one "you are here" at a time). */
    open?: boolean;
    /** Screens the host chrome already shows as tabs. The sheet leaves them
        out instead of listing every destination twice. */
    hostTabs?: readonly (ScreenId | "map")[];
    /** `tab`: icon over "You" in the bottom bar. `avatar`: the top-bar
        avatar button. */
    variant?: "tab" | "avatar";
  };

  let {
    onSignOut = defaultSignOut,
    open = $bindable(false),
    hostTabs = [],
    variant = "tab",
  }: Props = $props();

  const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");

  /** The map itself is never listed: every host has a Map tab or home button. */
  const SCREENS: { id: ScreenId; label: string; icon: typeof Star }[] = [
    { id: "today", label: "Today", icon: CalendarClock },
    { id: "planner", label: "Course planner", icon: ClipboardPenLine },
    { id: "finals", label: "Final exams", icon: FileText },
    { id: "calendar", label: "Academic calendar", icon: CalendarDays },
  ];
  const screens = $derived(SCREENS.filter((s) => !hostTabs.includes(s.id)));

  let screen = $state<SubScreen>("root");

  async function defaultSignOut() {
    await adminAuthStore.logout();
    toastStore.show("Signed out.", "info");
  }

  const displayName = $derived(
    adminAuthStore.displayName ?? adminAuthStore.username ?? "Contributor",
  );
  const roleLabel = $derived(
    adminAuthStore.role === "admin"
      ? "Admin"
      : adminAuthStore.role === "editor"
        ? "Editor"
        : "Contributor",
  );

  let triggerEl = $state<HTMLButtonElement | null>(null);
  let panelEl = $state<HTMLDivElement | null>(null);
  let panelStyle = $state("");
  /** Sheet rising from a bottom bar (phones) vs dropdown from a top bar. */
  let fromBottom = $state(true);
  /** Content below the fold: fade the bottom edge so it reads as scrollable. */
  let moreBelow = $state(false);
  let scrolled = $state(false);

  setSheetContext({
    get close() {
      return closePanel;
    },
    closeLabel: "Close",
    get back() {
      return screen === "root" ? null : popScreen;
    },
  });

  function scrollerOf(target: EventTarget | null): HTMLElement | null {
    if (target instanceof HTMLElement && target !== panelEl) return target;
    return panelEl?.querySelector<HTMLElement>(".map-chrome-scroll") ?? null;
  }

  function syncScroll(target: EventTarget | null = null) {
    const el = scrollerOf(target);
    if (!el) {
      moreBelow = false;
      scrolled = false;
      return;
    }
    moreBelow = el.scrollTop + el.clientHeight < el.scrollHeight - 4;
    scrolled = el.scrollTop > 0;
  }

  onMount(() => {
    const unregisterDismiss = registerEphemeralOverlayDismisser(() => {
      open = false;
    });
    return unregisterDismiss;
  });

  function updatePanelPosition() {
    if (!open || !triggerEl) return;
    const rect = triggerEl.getBoundingClientRect();
    // Anchor away from whichever edge the trigger sits against.
    fromBottom = rect.top >= window.innerHeight / 2;
    if (!fromBottom) {
      // Desktop: a dropdown under the avatar, right-aligned to it.
      const width = Math.min(23.5 * 16, window.innerWidth - 16);
      const left = Math.min(
        Math.max(8, rect.right - width),
        window.innerWidth - width - 8,
      );
      const top = Math.min(rect.bottom + 8, window.innerHeight - 8);
      const height = Math.max(240, Math.min(42 * 16, window.innerHeight - top - 8));
      panelStyle = `left: ${left}px; top: ${top}px; bottom: auto; width: ${width}px; height: ${height}px;`;
      return;
    }
    // Phones: a full-height sheet that stops at the top of the bottom bar,
    // measured from the highest thing the bar paints (the add FAB overhangs
    // the bar's top edge), so the tab stays visible and no row hides under it.
    const bar = triggerEl.closest("nav") ?? triggerEl;
    const barTop = Math.min(
      bar.getBoundingClientRect().top,
      ...[...bar.children].map((el) => el.getBoundingClientRect().top),
    );
    const bottom = Math.max(0, window.innerHeight - barTop);
    const width = Math.min(35 * 16, window.innerWidth);
    const left = Math.round((window.innerWidth - width) / 2);
    panelStyle = `left: ${left}px; width: ${width}px; bottom: ${bottom}px; top: max(8px, env(safe-area-inset-top, 0px));`;
    requestAnimationFrame(() => syncScroll());
  }

  $effect(() => {
    if (!open) return;
    updatePanelPosition();
    const handleLayout = rafThrottle(updatePanelPosition);
    window.addEventListener("resize", handleLayout);
    return () => {
      window.removeEventListener("resize", handleLayout);
    };
  });

  // Closed any way (scrim, Escape, a modal opening): start at the root next time.
  $effect(() => {
    if (!open) screen = "root";
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

  async function pushScreen(next: SubScreen) {
    screen = next;
    await tick();
    panelEl?.focus();
    syncScroll();
  }

  async function popScreen() {
    screen = "root";
    await tick();
    panelEl?.focus();
    syncScroll();
  }

  // Back pops a pushed screen first, then closes the sheet, never the app.
  trackOverlay("menu", () => open, closePanel);
  trackOverlay(
    "you-screen",
    () => open && screen !== "root",
    () => {
      screen = "root";
    },
  );

  // Focus the panel itself, not its first row: a tap-opened sheet should not
  // paint a focus ring on whichever row comes first.
  $effect(() => {
    if (!open || !panelEl) return;
    return trapFocus(panelEl, {
      onEscape: () => (screen === "root" ? closePanel() : void popScreen()),
      initialFocus: panelEl,
    });
  });

  /** Close the sheet, then run what the row opens (a modal or a screen). */
  function then(action: () => void) {
    return () => {
      closePanel();
      action();
    };
  }

  function handleAccount() {
    if (adminAuthStore.username) {
      adminAuthStore.openAccountSettings();
    } else {
      adminAuthStore.openLogin("signin");
    }
  }

  const triggerName = $derived(
    adminAuthStore.username ? displayName : "You",
  );
</script>

<div class="app-menu" class:app-menu--avatar={variant === "avatar"}>
  <button
    bind:this={triggerEl}
    type="button"
    class="app-menu__trigger"
    class:map-chrome-chip={variant === "tab"}
    aria-expanded={open}
    aria-haspopup="dialog"
    aria-controls="app-menu-panel"
    aria-label="You"
    title={variant === "avatar" ? triggerName : undefined}
    onclick={toggleOpen}
  >
    {#if adminAuthStore.username}
      <Avatar name={displayName} size={variant === "avatar" ? 32 : 24} />
    {:else}
      <span class="app-menu__trigger-icon" aria-hidden="true">
        <UserRound size={variant === "avatar" ? 20 : 24} aria-hidden="true" />
      </span>
    {/if}
    {#if variant === "tab"}
      <span class="app-menu__trigger-label">You</span>
    {/if}
  </button>

  {#if open}
    <!-- Modal scrim: a tap outside only closes the sheet; it never also lands
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
      class:app-menu__panel--sheet={fromBottom}
      class:app-menu__panel--more-below={moreBelow}
      data-scrolled={scrolled ? "" : undefined}
      style={panelStyle}
      onscrollcapture={(event) => syncScroll(event.target)}
      role="dialog"
      aria-modal="true"
      aria-label="You"
      tabindex="-1"
      use:portal
      in:fly={panelReveal(reducedMotion.current, fromBottom ? 24 : -8)}
      out:fly={panelDismiss(reducedMotion.current, fromBottom ? 16 : -6)}
    >
      {#if screen === "saved"}
        <SavedPlacesModal />
      {:else if screen === "storage"}
        <OfflineMapsModal />
      {:else if screen === "settings"}
        <SettingsModal />
      {:else if screen === "contributors"}
        <ContributorsModal />
      {:else}
        <ModalHeader title="You" />
        <div class="app-menu__scroll map-chrome-scroll">
          <section class="app-menu__group" aria-label="Account">
            {#if adminAuthStore.username}
              <SettingsRow
                label={displayName}
                supporting={`${roleLabel} account settings`}
                chevron
                onclick={then(handleAccount)}
              >
                {#snippet leading()}
                  <Avatar name={displayName} size={32} />
                {/snippet}
              </SettingsRow>
              <SettingsRow
                icon={LogOut}
                label="Sign out"
                onclick={then(() => void onSignOut())}
              />
            {:else}
              <SettingsRow
                icon={UserRound}
                label="Sign in"
                supporting="Keep plans on every device and get credit for edits"
                onclick={then(handleAccount)}
              />
            {/if}
          </section>

          <section class="app-menu__group" aria-label="Your things">
            <SettingsRow
              icon={Star}
              label="Saved and recently viewed"
              chevron
              onclick={() => void pushScreen("saved")}
            />
            <SettingsRow
              icon={CloudDownload}
              label="Offline maps & storage"
              chevron
              onclick={() => void pushScreen("storage")}
            />
            <SettingsRow
              icon={PencilLine}
              label="Your contributions"
              onclick={then(handleAccount)}
            />
            <SettingsRow
              icon={Trophy}
              label="Leaderboard"
              onclick={then(() => modalStore.openModal("leaderboard"))}
            />
            {#if adminAuthStore.canReview}
              <SettingsRow
                icon={Inbox}
                label="Review suggested edits"
                badge={proposalsStore.pendingCount}
                onclick={then(() => modalStore.openModal("review"))}
              />
            {/if}
          </section>

          <SettingsSection variant="list" title="Campus">
            {#each screens as item (item.id)}
              <SettingsRow
                icon={item.icon}
                label={item.label}
                current={sidebarStore.panelOpen === item.id}
                onclick={then(() => sidebarStore.changeOpened(item.id))}
              />
            {/each}
            <SettingsRow
              icon={Megaphone}
              label="Announcements"
              badge={announcementsStore.unread}
              onclick={then(() => modalStore.openModal("announcements"))}
            />
            <SettingsRow
              icon={Phone}
              label="Emergency hotlines"
              onclick={then(() => modalStore.openModal("hotlines"))}
            />
            {#if campusTransit.enabled}
              <SettingsRow
                icon={Printer}
                label="Printable transit map"
                supporting="A PDF of every route to print or save"
                href="/api/transit-map"
                download
                onclick={closePanel}
              />
            {/if}
            <SettingsRow
              icon={ChartColumn}
              label="Campus data coverage"
              onclick={then(() => modalStore.openModal("coverage"))}
            />
          </SettingsSection>

          <section class="app-menu__group" aria-label="Settings">
            <SettingsRow
              icon={SettingsIcon}
              label="Settings"
              chevron
              onclick={() => void pushScreen("settings")}
            />
          </section>

          <SettingsSection variant="list" title="Help & feedback">
            <SettingsRow
              icon={CircleHelp}
              label="Help & FAQ"
              href="/faq"
              onclick={closePanel}
            />
            <SettingsRow
              icon={LifeBuoy}
              label="How Room TBA works"
              onclick={then(() =>
                modalStore.openModal("landing", { landingTab: "welcome" }),
              )}
            />
            <SettingsRow
              icon={BookOpen}
              label="Wiki"
              href="/wiki"
              onclick={closePanel}
            />
            <SettingsRow
              class="app-menu__shortcuts-entry"
              icon={Keyboard}
              label="Keyboard shortcuts"
              keyshortcuts="?"
              onclick={then(openShortcutsHelp)}
            />
            <SettingsRow
              icon={Users}
              label="Contributors"
              chevron
              onclick={() => void pushScreen("contributors")}
            />
            <SettingsRow
              icon={MessageSquare}
              label="Send feedback"
              onclick={then(() => modalStore.openModal("feedback"))}
            />
            <SettingsRow
              icon={MessagesSquare}
              label="Contact us"
              supporting="Questions or want to volunteer? Message the team"
              href={MESSENGER_CONTRIBUTE_TARGET}
              external
            />
            <SettingsRow
              icon={MessagesSquare}
              label="Discord"
              href={DISCORD_URL}
              external
            />
            <SettingsRow
              icon={Globe}
              label="UPLB Tools"
              href={UPLB_TOOLS_URL}
              external
            />
          </SettingsSection>

          <SettingsSection variant="list" title="About">
            <SettingsRow icon={Info} label="Version" value={APP_VERSION_LABEL} />
            <SettingsRow
              icon={FileText}
              label="What's new"
              onclick={then(() => modalStore.openModal("changelog"))}
            />
            <SettingsRow
              icon={Shield}
              label="Privacy"
              href="/privacy"
              onclick={closePanel}
            />
            <SettingsRow
              icon={Scale}
              label="Terms"
              href="/terms"
              onclick={closePanel}
            />
          </SettingsSection>

          <section class="app-menu__install" aria-label="Install app">
            <PWAInstallPrompt />
          </section>

          <!-- Passive status: not something to act on, so it goes last. -->
          <footer class="app-menu__footer">
            <OnlineCounter />
          </footer>
        </div>
      {/if}
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

  .app-menu__trigger-icon {
    display: inline-flex;
  }

  /* Desktop top bar: a round avatar button, like an account switcher. */
  .app-menu--avatar .app-menu__trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    margin: 0 0 0 0.25rem;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: var(--theme-text, hsl(5 20% 18%));
  }

  .app-menu--avatar .app-menu__trigger-icon {
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 999px;
    background: var(--theme-surface-3, hsl(5 20% 90%));
  }

  .app-menu--avatar .app-menu__trigger:hover,
  .app-menu--avatar .app-menu__trigger[aria-expanded="true"] {
    background: var(--theme-accent-soft, #feeaea);
  }

  .app-menu--avatar .app-menu__trigger:focus-visible {
    outline: 2px solid var(--theme-accent-text, hsl(345 75% 31%));
    outline-offset: 2px;
  }

  /* No physical keyboard on touch-only devices: the entry is noise there. */
  @media (hover: none) {
    .app-menu__panel :global(.app-menu__shortcuts-entry) {
      display: none;
    }
  }

  .app-menu__scrim {
    position: fixed;
    inset: 0;
    z-index: var(--z-chrome-popover, 17);
    background: hsla(0, 0%, 0%, 0.32);
  }

  .app-menu__panel {
    position: fixed;
    z-index: var(--z-chrome-popover, 17);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    overscroll-behavior: contain;
    padding: 0;
    border-radius: 1.75rem;
    background: var(--theme-surface, #fff);
  }

  /* Phones: a sheet from the bottom bar up, rounded on top only. */
  .app-menu__panel--sheet {
    border-radius: 1.75rem 1.75rem 0 0;
  }

  .app-menu__panel:focus {
    outline: none;
  }

  /* Pushed screens fill the sheet and scroll inside themselves. */
  .app-menu__panel > :global(*:not(.modal-header)) {
    flex: 1 1 auto;
    min-height: 0;
  }

  .app-menu__scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  /* A fade pinned to the bottom edge while more rows are below. */
  .app-menu__panel--more-below::after {
    content: "";
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    height: 3rem;
    background: linear-gradient(
      to bottom,
      transparent,
      var(--theme-surface, #fff) 90%
    );
    pointer-events: none;
  }

  .app-menu__group {
    display: flex;
    flex-direction: column;
    padding: 0.25rem 0;
  }

  /* One divider between groups, as in a Material list screen. */
  .app-menu__scroll > :global(* + *) {
    border-top: 1px solid var(--theme-border, hsl(5 12% 90%));
  }

  .app-menu__install :global(.pwa-install-prompt) {
    max-width: none;
    width: auto;
    margin: 0.5rem 1rem;
  }

  .app-menu__install:not(:has(:global(.pwa-install-prompt))) {
    display: none;
  }

  .app-menu__footer {
    display: flex;
    align-items: center;
    min-height: 0;
    padding: 0.5rem 1rem 1rem;
    font-size: 0.875rem;
    color: var(--theme-text-2, hsl(0, 0%, 40%));
  }

  .app-menu__footer:not(:has(:global(.online-counter))) {
    display: none;
  }

  .app-menu__footer :global(.online-counter) {
    height: auto;
    padding: 0;
    border: 0;
    background: none;
    box-shadow: none;
    font-size: 0.875rem;
    font-weight: 500;
    color: inherit;
  }
</style>
