<script lang="ts">
  import {
    adminAuthStore,
    editorChromeStore,
    sidebarStore,
  } from "@lib/store.svelte";

  import mapIcon from "../../../assets/icons/map.svg?url";
  import plannerIcon from "../../../assets/icons/planner.svg?url";
  import finalExamsIcon from "../../../assets/icons/final-exams.svg?url";
  import accountIcon from "../../../assets/icons/account.svg?url";

  type TabId = "map" | "planner" | "finals";

  const active = $derived(sidebarStore.panelOpen);

  function go(id: TabId) {
    sidebarStore.changeOpened(id);
  }

  function openAccount() {
    if (adminAuthStore.username) {
      adminAuthStore.openAccountSettings();
      return;
    }
    adminAuthStore.openLogin("signin");
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
    <img src={mapIcon} alt="" width="24" height="24" decoding="async" />
    <span>Map</span>
  </button>

  <button
    type="button"
    class="mobile-bottom-nav__item"
    class:mobile-bottom-nav__item--active={active === "planner"}
    aria-current={active === "planner" ? "page" : undefined}
    onclick={() => go("planner")}
  >
    <img src={plannerIcon} alt="" width="24" height="24" decoding="async" />
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
    class:mobile-bottom-nav__item--active={active === "finals"}
    aria-current={active === "finals" ? "page" : undefined}
    onclick={() => go("finals")}
  >
    <img src={finalExamsIcon} alt="" width="24" height="24" decoding="async" />
    <span>Final Exams</span>
  </button>

  <button
    type="button"
    class="mobile-bottom-nav__item"
    onclick={openAccount}
  >
    <img src={accountIcon} alt="" width="24" height="24" decoding="async" />
    <span>Account</span>
  </button>
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
    border-top: 1px solid #f0eaeb;
    background: #fff;
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
    color: #3a3032;
    font: inherit;
    font-size: 0.625rem;
    font-weight: 500;
    line-height: 1.1;
    cursor: pointer;
  }

  .mobile-bottom-nav__item img {
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
    background: #feeaea;
    color: #8d1437;
  }

  .mobile-bottom-nav__item--active img {
    filter: invert(14%) sepia(62%) saturate(2800%) hue-rotate(325deg)
      brightness(85%) contrast(95%);
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
    background: #8d1437;
    color: #fff;
    box-shadow: 0 3px 10px rgb(141 20 55 / 0.35);
    cursor: pointer;
    transform: translateY(-0.65rem);
  }

  .mobile-bottom-nav__fab:hover {
    background: #7a1130;
  }
</style>
