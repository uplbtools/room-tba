<script lang="ts">
  import { sidebarStore } from "@lib/store.svelte";
  import AppMenu from "../status-bar/AppMenu.svelte";

  type NavId = "map" | "planner" | "finals";

  const links: { id: NavId; label: string }[] = [
    { id: "map", label: "Map" },
    { id: "planner", label: "Planner" },
    { id: "finals", label: "Final exams" },
  ];

  const hostTabs = links.map((link) => link.id);
  let menuOpen = $state(false);
  /** The open menu is the one "you are here"; mute the tab under it. */
  const active = $derived(menuOpen ? null : sidebarStore.panelOpen);

  function go(id: NavId) {
    sidebarStore.changeOpened(id);
  }

</script>

<header class="desktop-top-bar" aria-label="App navigation">
  <button
    type="button"
    class="desktop-top-bar__brand"
    aria-label="Room TBA home"
    onclick={() => go("map")}
  >
    <img
      src="/logo-inverted.png"
      alt=""
      width="24"
      height="24"
      class="desktop-top-bar__logo"
      decoding="async"
    />
    <span class="desktop-top-bar__title">Room TBA</span>
  </button>

  <nav class="desktop-top-bar__nav" aria-label="Primary">
    {#each links as link (link.id)}
      <button
        type="button"
        class="desktop-top-bar__link"
        class:desktop-top-bar__link--active={active === link.id}
        aria-current={active === link.id ? "page" : undefined}
        onclick={() => go(link.id)}
      >
        {link.label}
      </button>
    {/each}
    <!-- You: account, sign in and everything that is not a tab (the Wiki
         sits under Help & feedback there), the same sheet the phone opens. -->
    <AppMenu bind:open={menuOpen} {hostTabs} variant="avatar" />
  </nav>
</header>

<style>
  .desktop-top-bar {
    pointer-events: auto;
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    box-sizing: border-box;
    width: 100%;
    height: var(--desktop-top-bar-height, 3.5625rem);
    padding: 0 clamp(0.75rem, 1.5vw, 1.25rem);
    background: var(--theme-accent-soft, #f9f6f6);
    border-bottom: 1px solid var(--theme-accent-border, hsl(5 12% 88%));
    z-index: 1;
  }

  .desktop-top-bar__brand {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
  }

  .desktop-top-bar__logo {
    width: 24px;
    height: 24px;
    border-radius: 6px;
  }

  .desktop-top-bar__title {
    font-family: "DM Sans", Inter, system-ui, sans-serif;
    font-size: clamp(0.95rem, 1.15vw, 1.09rem);
    font-weight: 700;
    line-height: 1;
    color: var(--theme-accent-text, #7e272c);
  }

  .desktop-top-bar__nav {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    min-width: 0;
  }

  .desktop-top-bar__link {
    margin: 0;
    padding: 0.45rem clamp(0.5rem, 0.9vw, 0.75rem);
    border: none;
    border-radius: 10px;
    background: transparent;
    color: var(--theme-text, #332529);
    font: inherit;
    font-size: clamp(0.8125rem, 0.95vw, 0.875rem);
    text-decoration: none;
    cursor: pointer;
  }

  .desktop-top-bar__link--active {
    background: var(--theme-accent-soft, #feeaea);
  }

  .desktop-top-bar__link:hover {
    background: var(--theme-accent-soft, #feeaea);
  }
</style>
