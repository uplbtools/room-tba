<script lang="ts">
  import { modalStore } from "@lib/store.svelte";
  import { fade, fly } from "svelte/transition";
  import {
    modalContentDismiss,
    modalContentReveal,
    overlayFade,
  } from "@lib/motion";
  import { trapFocus } from "@lib/focus-trap";
  import { MediaQuery } from "svelte/reactivity";
  import LandingModal from "./LandingModal.svelte";
  import ScheduleModal from "./ScheduleModal.svelte";
  import LeaderboardModal from "./LeaderboardModal.svelte";
  import CoverageModal from "./CoverageModal.svelte";
  import ChangelogModal from "./ChangelogModal.svelte";
  import ProposalReviewPanel from "../ProposalReviewPanel.svelte";
  import StudentOrgsModal from "./StudentOrgsModal.svelte";
  import SettingsModal from "./SettingsModal.svelte";
  import JeepneyRouteModal from "./JeepneyRouteModal.svelte";
  import EditorToolsModal from "./EditorToolsModal.svelte";
  import IconButton from "@ui/IconButton.svelte";
  import X from "@lucide/svelte/icons/x";

  const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");

  let modalContentEl = $state<HTMLDivElement | null>(null);
  let overlayCloseReady = $state(false);

  $effect(() => {
    if (!modalStore.open) {
      overlayCloseReady = false;
      return;
    }
    overlayCloseReady = false;
    const frame = requestAnimationFrame(() => {
      overlayCloseReady = true;
    });
    return () => cancelAnimationFrame(frame);
  });

  const modalAriaLabel = $derived.by(() => {
    if (modalStore.type === "landing") return undefined;
    if (modalStore.type === "schedule-expand") return "Room schedule";
    if (modalStore.type === "leaderboard") return "Contributor leaderboard";
    if (modalStore.type === "coverage") return "Campus data coverage";
    if (modalStore.type === "changelog") return "What's new";
    if (modalStore.type === "review") return "Review suggested edits";
    if (modalStore.type === "student-orgs") return "Student organizations";
    if (modalStore.type === "settings") return "Settings";
    if (modalStore.type === "jeepney-route") return "Jeepney route";
    if (modalStore.type === "editor-tools") return "Editor tools";
    return "Dialog";
  });

  function closeDialog() {
    modalStore.closeModal();
  }

  function handleOverlayClick() {
    if (!overlayCloseReady) return;
    closeDialog();
  }

  $effect(() => {
    if (!modalStore.open || !modalContentEl) return;
    return trapFocus(modalContentEl, {
      onEscape: closeDialog,
    });
  });
</script>

{#if modalStore.open}
  <div class="modal-set">
    <button
      type="button"
      class="overlay"
      aria-label="Close dialog"
      onclick={handleOverlayClick}
      transition:fade={overlayFade(reducedMotion.current)}
    ></button>
    <div
      bind:this={modalContentEl}
      class="modal-content {modalStore.type === 'landing'
        ? 'landing-modal-container'
        : modalStore.type === 'leaderboard' || modalStore.type === 'coverage'
          ? 'leaderboard-modal-container'
          : modalStore.type === 'changelog' || modalStore.type === 'review'
            ? 'modal-content--large'
            : modalStore.type === 'settings' ||
                modalStore.type === 'jeepney-route' ||
                modalStore.type === 'editor-tools'
              ? 'modal-content--reading'
              : ''}"
      id="modal-content"
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalStore.type === "landing"
        ? "landing-modal-title"
        : modalStore.type === "leaderboard"
          ? "leaderboard-modal-title"
          : modalStore.type === "coverage"
            ? "coverage-modal-title"
            : undefined}
      aria-label={modalAriaLabel}
      in:fly={modalContentReveal(reducedMotion.current)}
      out:fly={modalContentDismiss(reducedMotion.current)}
    >
      {#if modalStore.type === "landing"}
        <LandingModal />
      {:else if modalStore.type === "schedule-expand"}
        <IconButton
          class="modal-content__close-icon"
          label="Close schedule"
          onclick={closeDialog}
        >
          <X size={20} aria-hidden="true" />
        </IconButton>
        <ScheduleModal />
      {:else if modalStore.type === "leaderboard"}
        <IconButton
          class="modal-content__close-icon"
          label="Close leaderboard"
          onclick={closeDialog}
        >
          <X size={20} aria-hidden="true" />
        </IconButton>
        <LeaderboardModal />
      {:else if modalStore.type === "coverage"}
        <IconButton
          class="modal-content__close-icon"
          label="Close data coverage"
          onclick={closeDialog}
        >
          <X size={20} aria-hidden="true" />
        </IconButton>
        <CoverageModal />
      {:else if modalStore.type === "changelog"}
        <IconButton
          class="modal-content__close-icon"
          label="Close changelog"
          onclick={closeDialog}
        >
          <X size={20} aria-hidden="true" />
        </IconButton>
        <ChangelogModal />
      {:else if modalStore.type === "review"}
        <IconButton
          class="modal-content__close-icon"
          label="Close review"
          onclick={closeDialog}
        >
          <X size={20} aria-hidden="true" />
        </IconButton>
        <div class="review-modal-scroll">
          <ProposalReviewPanel />
        </div>
      {:else if modalStore.type === "student-orgs"}
        <IconButton
          class="modal-content__close-icon"
          label="Close student organizations"
          onclick={closeDialog}
        >
          <X size={20} aria-hidden="true" />
        </IconButton>
        <StudentOrgsModal />
      {:else if modalStore.type === "settings"}
        <IconButton
          class="modal-content__close-icon"
          label="Close settings"
          onclick={closeDialog}
        >
          <X size={20} aria-hidden="true" />
        </IconButton>
        <SettingsModal />
      {:else if modalStore.type === "jeepney-route"}
        <IconButton
          class="modal-content__close-icon"
          label="Close jeepney route"
          onclick={closeDialog}
        >
          <X size={20} aria-hidden="true" />
        </IconButton>
        <JeepneyRouteModal />
      {:else if modalStore.type === "editor-tools"}
        <IconButton
          class="modal-content__close-icon"
          label="Close editor tools"
          onclick={closeDialog}
        >
          <X size={20} aria-hidden="true" />
        </IconButton>
        <EditorToolsModal />
      {/if}
    </div>
  </div>
{/if}

<style>
  :global(hr) {
    margin: 1rem 0;
    border-width: 2px;
    border-color: hsl(0, 0%, 90%);
    border-style: solid;
  }
  :global(mark) {
    background-color: hsl(5, 53%, 90%);
  }
  .modal-set {
    position: fixed;
    top: 50%;
    left: 50%;
    translate: -50% -50%;
    padding: 0.75rem;
    width: 100%;
    height: 100dvh;
    z-index: var(--z-modal, 100);
    display: flex;
    justify-content: center;
    align-items: center;
    box-sizing: border-box;
    pointer-events: auto;
  }
  .review-modal-scroll {
    min-height: 0;
    flex: 1 1 auto;
    overflow-y: auto;
    padding: 0.5rem 0.75rem 0.25rem;
  }

  .modal-content {
    position: relative;
    flex: 0 1 64rem;
    max-height: 90dvh;
    min-height: 0;
    background-color: white;
    z-index: inherit;
    border-radius: 1rem;
    padding: 0.5rem;
    display: flex;
    flex-flow: column nowrap;
    overflow: hidden;
    :global(.modal-content__close-icon) {
      position: absolute;
      right: 0.25rem;
      top: 0.25rem;
      z-index: 1;
      background-color: #fff;
    }
  }
  /* Task-focused dialogs (review queue, changelog) take most of the screen. */
  .modal-content--large {
    flex: 0 1 72rem;
    width: 100%;
    height: min(90dvh, 56rem);
  }
  /* Settings/route dialogs cap at a readable measure so lines stay short. */
  .modal-content--reading {
    flex: 0 1 38rem;
  }
  .leaderboard-modal-container {
    flex: 0 1 32rem;
  }
  .landing-modal-container {
    flex: 0 1 48rem;
    width: 100%;
    max-height: min(92dvh, 52rem);
    padding: 0;
    overflow: hidden;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  @media only screen and (max-width: 31.25rem) {
    .modal-content {
      padding: 0.25rem;
    }
    .landing-modal-container {
      padding: 0;
    }
  }
  .overlay {
    all: unset;
    width: 100%;
    height: 100%;
    inset: 0;
    position: absolute;
    background-color: hsla(0, 0%, 8%, 0.42);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    cursor: pointer;
  }

  .overlay:focus-visible {
    outline: 2px solid white;
    outline-offset: -4px;
  }
</style>
