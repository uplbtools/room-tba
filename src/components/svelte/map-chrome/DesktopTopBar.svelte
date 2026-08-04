<script lang="ts">
  import { adminAuthStore, sidebarStore } from "@lib/store.svelte";

  type NavId = "map" | "planner" | "finals";

  const links: { id: NavId; label: string }[] = [
    { id: "map", label: "Map" },
    { id: "planner", label: "Planner" },
    { id: "finals", label: "Final Exams" },
  ];

  const active = $derived(sidebarStore.panelOpen);

  function go(id: NavId) {
    sidebarStore.changeOpened(id);
  }

  function handleSignIn() {
    if (adminAuthStore.username) {
      adminAuthStore.openAccountSettings();
      return;
    }
    adminAuthStore.openLogin("signin");
  }

  const signInLabel = $derived(
    adminAuthStore.username ? "Account" : "Contributor sign in",
  );
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
    <a href="/wiki" class="desktop-top-bar__link">Wiki</a>
    <button
      type="button"
      class="desktop-top-bar__signin"
      onclick={handleSignIn}
    >
      {signInLabel}
    </button>
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
    background: #f9f6f6;
    border-bottom: 1px solid hsl(5 12% 88%);
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
    color: #7e272c;
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
    color: #332529;
    font: inherit;
    font-size: clamp(0.8125rem, 0.95vw, 0.875rem);
    text-decoration: none;
    cursor: pointer;
  }

  .desktop-top-bar__link--active {
    background: #feeaea;
  }

  .desktop-top-bar__link:hover {
    background: #feeaea;
  }

  .desktop-top-bar__signin {
    margin: 0 0 0 4px;
    padding: 0.45rem clamp(0.75rem, 1.2vw, 1rem);
    border: none;
    border-radius: 10px;
    background: #8d1437;
    color: #fff;
    font: inherit;
    font-size: clamp(0.8125rem, 0.95vw, 0.875rem);
    cursor: pointer;
  }
</style>
