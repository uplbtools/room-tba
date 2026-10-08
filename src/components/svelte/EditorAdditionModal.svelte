<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import ModalHeader from "@ui/modal/ModalHeader.svelte";
  import { adminAuthStore, editorChromeStore } from "@lib/store.svelte";
  import {
    modalContentDismiss,
    modalContentReveal,
    overlayFade,
  } from "@lib/motion";
  import SuggestAdditionPanel from "@ui/SuggestAdditionPanel.svelte";
  import { MediaQuery } from "svelte/reactivity";

  const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");

  let dialogEl = $state<HTMLDivElement | null>(null);

  function close() {
    editorChromeStore.closeAdditionModal();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") close();
  }

  // No focus trap: this panel is non-modal now (#966). Trapping focus would
  // lock keyboard users out of the very map they are placing a pin on.
  // Escape still closes, via handleKeydown.

  // Same click-outside pattern as AppMenu / TermSelector / OfflineMaps /
  // KeyboardShortcutsPopup: a window-level pointerdown that bails when the
  // event lands inside the dialog. Keeps the dismiss affordance off the
  // static overlay div, which would need its own keyboard handler (a11y).
  //
  // #966 exempts the map surface. Adding a place means looking around and
  // dropping a pin, so a pan or a marker tap is the user working *with* this
  // panel — dismissing there would make the panel unusable. Clicks on other
  // chrome still dismiss, which is what #836 asked for.
  function handleDocumentPointerDown(event: PointerEvent) {
    if (!editorChromeStore.additionModalOpen) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (dialogEl?.contains(target)) return;
    if (target instanceof Element && target.closest(".map")) return;
    close();
  }
</script>

<svelte:window
  onkeydown={handleKeydown}
  onpointerdown={handleDocumentPointerDown}
/>

{#if editorChromeStore.additionModalOpen}
  <div
    class="editor-addition-overlay"
    transition:fade={overlayFade(reducedMotion.current)}
  >
    <div
      bind:this={dialogEl}
      class="editor-addition-frame"
      role="dialog"
      aria-labelledby="editor-addition-title"
      in:fly={modalContentReveal(reducedMotion.current)}
      out:fly={modalContentDismiss(reducedMotion.current)}
    >
      <ModalHeader
        id="editor-addition-title"
        title="Add to map"
        onclose={close}
        closeLabel="Close add to map"
      />
      <div class="editor-addition-body map-chrome-scroll">
        <SuggestAdditionPanel
          mode={adminAuthStore.canPublish ? "publish" : "proposal"}
          onDismiss={() => editorChromeStore.closeAdditionModal()}
          onRestore={() => editorChromeStore.openAdditionModal()}
        />
      </div>
    </div>
  </div>
{/if}

<style>
  .editor-addition-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    /* Docked, not centred: placing a pin needs the map visible and live, so
       the panel sits at the bottom and the overlay itself catches nothing
       (#966). No backdrop for the same reason. */
    align-items: flex-end;
    justify-content: center;
    padding: 1rem;
    pointer-events: none;
  }

  @media (min-width: 48rem) {
    .editor-addition-overlay {
      align-items: center;
      justify-content: flex-end;
      padding: 1.5rem;
    }
  }

  .editor-addition-frame {
    display: flex;
    /* The overlay is inert; the panel itself is the only live surface. */
    pointer-events: auto;
    width: min(28rem, 100%);
    /* Leave a map strip above the docked panel to pan and drop a pin in. */
    max-height: min(60dvh, 40rem);
    flex-direction: column;
    overflow: hidden;
    border-radius: 0.75rem;
    border: 1px solid var(--map-chrome-border, var(--theme-accent-border, hsl(5, 25%, 78%)));
    background: var(--map-chrome-surface, var(--theme-surface, #fffafa));
    box-shadow: var(--map-chrome-panel-shadow, 0 18px 38px rgba(0, 0, 0, 0.3));
  }



  .editor-addition-body {
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 1rem;
    -webkit-overflow-scrolling: touch;
  }

  /* Phones: a full-screen sheet, like any app's "add a place" form. The map
     is not needed while typing; "Pick on map" hides the sheet for the pin
     drop and brings it back after (SuggestAdditionPanel.pickOnMap). */
  @media (max-width: 47.99rem) {
    .editor-addition-overlay {
      align-items: stretch;
      padding: 0;
    }

    .editor-addition-frame {
      width: 100%;
      height: 100dvh;
      max-height: none;
      border: none;
      border-radius: 0;
      box-shadow: none;
    }

    .editor-addition-header {
      padding-top: calc(0.625rem + env(safe-area-inset-top, 0px));
    }

    .editor-addition-body {
      flex: 1;
      padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
    }
  }
</style>
