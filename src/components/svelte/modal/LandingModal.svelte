<script lang="ts">
  import Search from "@lucide/svelte/icons/search";
  import Navigation from "@lucide/svelte/icons/navigation";
  import Bus from "@lucide/svelte/icons/bus";
  import ClipboardPen from "@lucide/svelte/icons/clipboard-pen";
  import Star from "@lucide/svelte/icons/star";
  import Ticket from "@lucide/svelte/icons/ticket";
  import CloudDownload from "@lucide/svelte/icons/cloud-download";
  import Moon from "@lucide/svelte/icons/moon";
  import PencilLine from "@lucide/svelte/icons/pencil-line";
  import ClipboardCheck from "@lucide/svelte/icons/clipboard-check";
  import CircleCheck from "@lucide/svelte/icons/circle-check";
  import CircleHelp from "@lucide/svelte/icons/circle-help";
  import Download from "@lucide/svelte/icons/download";
  import { untrack } from "svelte";
  import type { BeforeInstallPromptEvent } from "@lib/types";
  import { openCampusBrowse } from "@lib/browse-campus";
  import { focusSearch } from "@lib/search-focus";
  import {
    directionsStore,
    editorChromeStore,
    jeepneyStore,
    locationStore,
    modalStore,
    queryStore,
    sidePanelStore,
    sidebarStore,
    YOUR_LOCATION_LABEL,
  } from "@lib/store.svelte";
  import { campusTransit } from "../../../campus.config";
  import ModalHeader from "./ModalHeader.svelte";
  import SettingsRow from "./SettingsRow.svelte";
  import SettingsSection from "./SettingsSection.svelte";
  import "../map-chrome/map-chrome.css";

  /**
   * How Room TBA works: what a student can do, each as a row that does it,
   * then a short note on how the map stays correct. Same content on every
   * screen size. Opened from the menu, the X closes it; on the first visit a
   * "Done" action in the bar dismisses it as well.
   */

  // Only Entry's first-visit auto-open passes no tab; every menu entry names
  // one. A revisit is not "getting started".
  let firstRun = $state(true);
  let installPrompt = $state<BeforeInstallPromptEvent | null>(null);
  let isInstalled = $state(false);

  /** Close the guide, then take the user where the row says. */
  function go(action: () => void) {
    modalStore.closeModal();
    action();
  }

  const features = [
    {
      icon: Search,
      label: "Search rooms and buildings",
      supporting: "Type a room code like PS 105 or a building name",
      action: () => {
        sidebarStore.changeOpened("map");
        focusSearch();
      },
    },
    {
      icon: Navigation,
      label: "Get directions",
      supporting: "Walking routes, with jeepneys for longer trips",
      action: () => {
        sidebarStore.changeOpened("map");
        const coords = locationStore.coords;
        locationStore.requestLocation();
        directionsStore.openEmpty(
          coords
            ? { lat: coords[1], lng: coords[0], label: YOUR_LOCATION_LABEL }
            : null,
        );
      },
    },
    ...(campusTransit.enabled
      ? [
          {
            icon: Bus,
            label: "Jeepney and bus routes",
            supporting: "Stops, fares, and paths on the map",
            action: () => {
              sidebarStore.changeOpened("map");
              jeepneyStore.enableLayer();
              openCampusBrowse(
                queryStore,
                sidePanelStore,
                "jeepney",
                campusTransit.label,
              );
            },
          },
        ]
      : []),
    {
      icon: ClipboardPen,
      label: "Plan your classes",
      supporting: "Build a schedule, then follow your day in Today",
      action: () => sidebarStore.changeOpened("planner"),
    },
    {
      icon: Star,
      label: "Saved places",
      supporting: "Star a place to find it again fast",
      action: () => modalStore.openModal("saved-places"),
    },
    {
      icon: Ticket,
      label: "Campus events",
      supporting: "See what is on and where",
      action: () => {
        sidebarStore.changeOpened("map");
        queryStore.updateQuery({
          category: "events",
          type: "result",
          value: "Campus events",
        });
        queryStore.inputValue = "Events";
        sidePanelStore.expand();
      },
    },
    {
      icon: CloudDownload,
      label: "Offline maps",
      supporting: "Download the campus for weak signal",
      action: () => modalStore.openModal("offline-maps"),
    },
    {
      icon: Moon,
      label: "Dark mode",
      supporting: "Light, dark, or match your device",
      action: () => modalStore.openModal("settings"),
    },
  ];

  const steps = [
    {
      icon: PencilLine,
      label: "Suggest",
      supporting: "Spot something wrong or missing? Suggest an edit.",
    },
    {
      icon: ClipboardCheck,
      label: "Review",
      supporting: "Volunteer editors check each suggestion.",
    },
    {
      icon: CircleCheck,
      label: "Publish",
      supporting: "Approved changes go live for everyone.",
    },
  ];

  async function install() {
    const prompt = installPrompt;
    if (!prompt) return;
    installPrompt = null;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") isInstalled = true;
  }

  $effect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      installPrompt = e as BeforeInstallPromptEvent;
    };
    window.addEventListener("beforeinstallprompt", handler);
    const iosStandalone =
      "standalone" in window.navigator &&
      (window.navigator as unknown as { standalone: boolean }).standalone ===
        true;
    isInstalled =
      iosStandalone || window.matchMedia("(display-mode: standalone)").matches;
    return () => window.removeEventListener("beforeinstallprompt", handler);
  });

  $effect(() => {
    if (!modalStore.open) return;
    firstRun = untrack(() => modalStore.landingTab) === undefined;
  });
</script>

<div class="landing">
  <ModalHeader
    id="landing-modal-title"
    title="How Room TBA works"
  >
    {#snippet trailing()}
      {#if firstRun}
        <button
          type="button"
          class="landing__text-btn"
          onclick={() => modalStore.closeModal()}
        >
          Done
        </button>
      {/if}
    {/snippet}
  </ModalHeader>

  <div class="landing__scroll map-chrome-scroll">
    <p class="landing__intro">
      Find rooms, routes, classes, and events at UPLB. No account needed.
    </p>

    <SettingsSection variant="list" title="What you can do">
      <ul class="landing__list" id="landing-panel-welcome">
        {#each features as feature (feature.label)}
          <li>
            <SettingsRow
              icon={feature.icon}
              label={feature.label}
              supporting={feature.supporting}
              chevron
              onclick={() => go(feature.action)}
            />
          </li>
        {/each}
        {#if installPrompt && !isInstalled}
          <li>
            <SettingsRow
              icon={Download}
              label="Install Room TBA"
              supporting="Open it from your home screen like an app"
              onclick={() => void install()}
            />
          </li>
        {/if}
      </ul>
    </SettingsSection>

    <SettingsSection variant="list" title="Help improve the map">
      <ol class="landing__list landing__steps">
        {#each steps as step (step.label)}
          <li>
            <SettingsRow
              icon={step.icon}
              label={step.label}
              supporting={step.supporting}
            />
          </li>
        {/each}
      </ol>
      <div class="landing__action">
        <button
          type="button"
          class="landing__tonal-btn"
          onclick={() => go(() => editorChromeStore.openAdditionModal())}
        >
          <PencilLine size={18} aria-hidden="true" />
          Suggest an edit
        </button>
      </div>
    </SettingsSection>

    <SettingsSection variant="list" title="More help">
      <SettingsRow
        icon={CircleHelp}
        label="Help & FAQ"
        supporting="Answers to common questions"
        href="/faq"
        chevron
      />
    </SettingsSection>

    <p class="landing__legal">
      <a href="/privacy">Privacy</a>
      <a href="/terms">Terms</a>
    </p>
  </div>
</div>

<style>
  .landing {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
  }

  .landing__scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding-bottom: 0.5rem;
  }

  .landing__intro {
    margin: 0;
    padding: 0 1rem 0.25rem;
    font-size: 1rem;
    line-height: 1.5;
    color: var(--theme-text-2, hsl(0, 0%, 35%));
  }

  .landing__list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .landing__action {
    padding: 0.25rem 1rem 0.5rem 4.5rem;
  }

  /* Material tonal button: 40px, soft brand fill. */
  .landing__tonal-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 2.5rem;
    padding: 0 1.5rem 0 1rem;
    border: none;
    border-radius: 999px;
    background: var(--theme-accent-soft, hsl(345, 60%, 94%));
    color: var(--theme-accent-text, hsl(345, 75%, 28%));
    font: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
  }

  .landing__text-btn {
    min-height: 2.5rem;
    padding: 0 0.75rem;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: var(--theme-accent-text, hsl(345, 75%, 31%));
    font: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
  }

  @media (hover: hover) {
    .landing__text-btn:hover {
      background: var(--theme-accent-soft, hsl(345, 60%, 95%));
    }
  }

  .landing__tonal-btn:focus-visible,
  .landing__text-btn:focus-visible,
  .landing__legal a:focus-visible {
    outline: 2px solid var(--theme-accent-text, hsl(345, 75%, 31%));
    outline-offset: 2px;
  }

  .landing__legal {
    display: flex;
    gap: 1.25rem;
    margin: 0;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }

  .landing__legal a {
    display: inline-flex;
    align-items: center;
    min-height: 2.75rem;
    color: var(--theme-text-2, hsl(0, 0%, 35%));
    text-decoration: underline;
    text-underline-offset: 2px;
  }
</style>
