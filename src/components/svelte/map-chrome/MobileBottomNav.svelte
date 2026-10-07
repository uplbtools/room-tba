<script lang="ts">
  import { editorChromeStore, sidebarStore } from "@lib/store.svelte";
  import AppMenu from "../status-bar/AppMenu.svelte";
  import CalendarClock from "@lucide/svelte/icons/calendar-clock";
  import ClipboardPen from "@lucide/svelte/icons/clipboard-pen";
  import Map from "@lucide/svelte/icons/map";

  type TabId = "map" | "planner" | "today";

  let menuOpen = $state(false);
  /** While the menu sheet is open it is the one "you are here"; the tab under
      it must not also look selected. */
  const active = $derived(menuOpen ? null : sidebarStore.panelOpen);
  const tabs = ["map", "planner", "today"] as const;

  function go(id: TabId) {
    sidebarStore.changeOpened(id);
  }
</script>

<nav class="mobile-bottom-nav" aria-label="Primary">
  <button
    type="button"
    class="mobile-bottom-nav__item"
    class:mobile-bottom-nav__item--active={active === "map"}
    aria-current={active === "map" ? "page" : undefined}
    onclick={() => go("map")}
  >
    <Map size={24} aria-hidden="true" />
    <span>Map</span>
  </button>

  <button
    type="button"
    class="mobile-bottom-nav__item"
    class:mobile-bottom-nav__item--active={active === "planner"}
    aria-current={active === "planner" ? "page" : undefined}
    onclick={() => go("planner")}
  >
    <ClipboardPen size={24} aria-hidden="true" />
    <span>Planner</span>
  </button>

  <button
    type="button"
    class="mobile-bottom-nav__fab"
    aria-label="Add something to the map"
    onclick={() => editorChromeStore.openAdditionModal()}
  >
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.25"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path
        d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"
      />
      <path d="M12 7v6" />
      <path d="M9 10h6" />
    </svg>
  </button>

  <button
    type="button"
    class="mobile-bottom-nav__item"
    class:mobile-bottom-nav__item--active={active === "today"}
    aria-current={active === "today" ? "page" : undefined}
    onclick={() => go("today")}
  >
    <CalendarClock size={24} aria-hidden="true" />
    <span>Today</span>
  </button>

  <!-- Menu, not Account: this is the only mobile entry point to Final Exams,
       the academic calendar, the changelog, coverage, the leaderboard and the
       review queue (#951). Sign in / account settings sits inside it. Finals
       lives here rather than the bar because it is seasonal (#951 follow-up:
       daily-relevant Today earns the slot). -->
  <AppMenu bind:open={menuOpen} hostTabs={tabs} />
</nav>

<style>
  .mobile-bottom-nav {
    pointer-events: auto;
    box-sizing: border-box;
    display: grid;
    grid-template-columns: 1fr 1fr auto 1fr 1fr;
    align-items: center;
    column-gap: 0.15rem;
    width: 100%;
    min-height: 3.75rem;
    padding: 0.4rem 0.4rem calc(0.4rem + env(safe-area-inset-bottom, 0px));
    border: none;
    border-top: 1px solid var(--theme-accent-border, #f0eaeb);
    background: var(--theme-surface, #fff);
    box-shadow: 0 -2px 12px rgb(0 0 0 / 0.06);
  }

  .mobile-bottom-nav__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.2rem;
    min-width: 0;
    min-height: 3rem;
    margin: 0;
    padding: 0.3rem 0.1rem;
    border: none;
    border-radius: 0.75rem;
    background: transparent;
    color: var(--theme-text, #3a3032);
    font: inherit;
    font-size: 0.625rem;
    font-weight: 500;
    line-height: 1.1;
    cursor: pointer;
  }

  .mobile-bottom-nav__item img,
  .mobile-bottom-nav__item svg {
    width: 1.5rem;
    height: 1.5rem;
    opacity: 0.92;
  }

  .mobile-bottom-nav__item span {
    overflow: hidden;
    max-width: 100%;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mobile-bottom-nav__item--active {
    background: var(--theme-accent-soft, #feeaea);
    color: var(--theme-accent-text, #8d1437);
  }

  .mobile-bottom-nav__fab {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 3.5rem;
    height: 3.5rem;
    margin: 0 0.15rem;
    padding: 0;
    border: none;
    border-radius: 1.05rem;
    background: var(--theme-accent-fill, #8d1437);
    color: #fff;
    box-shadow: 0 3px 10px rgb(141 20 55 / 0.35);
    cursor: pointer;
    transform: translateY(-0.65rem);
  }

  @media (hover: hover) {
    .mobile-bottom-nav__fab:hover {
      background: var(--theme-accent-fill, #7a1130);
    }
  }

  /* AppMenu ships its own chip styling for the status bar; here it has to read
     as the fifth tab, so strip the chip chrome and match .mobile-bottom-nav__item. */
  .mobile-bottom-nav :global(.app-menu) {
    display: flex;
    min-width: 0;
    justify-content: center;
    /* The wrapper is the grid cell; stretch it so the trigger can fill the same
       row box as the sibling tabs and their labels sit on one baseline. */
    align-self: stretch;
  }

  .mobile-bottom-nav :global(.app-menu__trigger) {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.2rem;
    width: 100%;
    min-width: 0;
    /* map-chrome-chip pins a fixed height; unpin it so the trigger grows to the
       same 58px as its siblings instead of sitting 10px short. */
    height: 100%;
    min-height: 3rem;
    margin: 0;
    padding: 0.3rem 0.1rem;
    border: none;
    border-radius: 0.75rem;
    background: transparent;
    box-shadow: none;
    color: var(--theme-text, #3a3032);
    font: inherit;
    font-size: 0.625rem;
    font-weight: 500;
    line-height: 1.1;
  }

  .mobile-bottom-nav :global(.app-menu__trigger svg) {
    width: 1.5rem;
    height: 1.5rem;
    opacity: 0.92;
  }

  .mobile-bottom-nav :global(.app-menu__trigger span) {
    overflow: hidden;
    max-width: 100%;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Beat map-chrome-chip's :hover (sticky after a tap on touch) so the
     trigger only tints while the menu is actually open. */
  .mobile-bottom-nav
    :global(.app-menu button.app-menu__trigger.map-chrome-chip:hover) {
    background: transparent;
  }

  .mobile-bottom-nav
    :global(.app-menu button.app-menu__trigger.map-chrome-chip[aria-expanded="true"]) {
    background: var(--theme-accent-soft, #feeaea);
    color: var(--theme-accent-text, #8d1437);
  }

  /* Phone landscape (Jakob audit macro 14): every pixel of height is map, so
     the bar goes icon-only at 44px with a flat, unraised FAB. Labels stay in
     the DOM, visually hidden, so each tab keeps its accessible name. */
  @media (orientation: landscape) and (max-height: 500px) {
    .mobile-bottom-nav {
      grid-template-columns: repeat(2, minmax(0, 5.5rem)) auto repeat(
          2,
          minmax(0, 5.5rem)
        );
      justify-content: center;
      column-gap: 0.75rem;
      min-height: 0;
      padding: 0 max(0.5rem, env(safe-area-inset-right, 0px))
        env(safe-area-inset-bottom, 0px)
        max(0.5rem, env(safe-area-inset-left, 0px));
    }

    .mobile-bottom-nav__item,
    .mobile-bottom-nav :global(.app-menu__trigger) {
      position: relative;
      min-height: 2.75rem;
      padding: 0;
    }

    .mobile-bottom-nav__item span,
    .mobile-bottom-nav :global(.app-menu__trigger span) {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }

    .mobile-bottom-nav__fab {
      width: 2.75rem;
      height: 2.5rem;
      border-radius: 0.875rem;
      box-shadow: none;
      transform: none;
    }
  }
</style>
