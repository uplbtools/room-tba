<script lang="ts">
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import { fly } from "svelte/transition";
  import { getMapChromeVisibility } from "@lib/map-chrome";
  import { trapFocus } from "@lib/focus-trap";
  import { fullScreenDismiss, fullScreenReveal } from "@lib/motion";
  import { editorChromeStore } from "@lib/store.svelte";
  import { adminAuthStore } from "@lib/stores/admin-auth.svelte";
  import EditorShelf from "@ui/EditorShelf.svelte";
  import { MediaQuery } from "svelte/reactivity";

  const mobile = new MediaQuery("max-width:48rem");
  const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");
  const chrome = $derived(getMapChromeVisibility());

  const visible = $derived(
    mobile.current &&
      editorChromeStore.shelfOpen &&
      chrome.showEditorShelf &&
      (adminAuthStore.canPublish || adminAuthStore.canReview),
  );

  let screenEl = $state<HTMLDivElement | null>(null);

  function close() {
    editorChromeStore.closeShelf();
  }

  $effect(() => {
    if (!visible || !screenEl) return;
    return trapFocus(screenEl, { onEscape: close });
  });
</script>

{#if visible}
  <div
    bind:this={screenEl}
    id="editor-screen"
    class="editor-screen"
    role="dialog"
    aria-modal="true"
    aria-labelledby="editor-screen-title"
    in:fly={fullScreenReveal(reducedMotion.current)}
    out:fly={fullScreenDismiss(reducedMotion.current)}
  >
    <header class="editor-screen-header">
      <button
        type="button"
        class="editor-screen-back"
        onclick={close}
        aria-label="Back to map"
      >
        <ChevronLeft size={22} aria-hidden="true" />
        <span>Map</span>
      </button>
      <h1 class="editor-screen-title" id="editor-screen-title">Editor</h1>
    </header>
    <div class="editor-screen-body">
      <EditorShelf onclose={close} />
    </div>
  </div>
{/if}

<style>
  .editor-screen {
    position: fixed;
    inset: 0;
    z-index: 18;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    background-color: var(--map-chrome-surface, rgba(255, 255, 255, 0.98));
    pointer-events: auto;
  }

  .editor-screen-header {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    padding: calc(env(safe-area-inset-top, 0px) + 0.375rem) 0.625rem 0.375rem;
    border-bottom: 1px solid var(--map-chrome-border, hsl(0, 0%, 58%));
    box-shadow: var(--map-chrome-shadow);
  }

  .editor-screen-back {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 0.125rem;
    min-height: 2rem;
    padding: 0.25rem 0.375rem 0.25rem 0.125rem;
    border-radius: 0.5rem;
    color: hsl(5, 53%, 32%);
    cursor: pointer;
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    touch-action: manipulation;
  }

  .editor-screen-back:hover,
  .editor-screen-back:focus-visible {
    background-color: hsl(5, 53%, 96%);
  }

  .editor-screen-back:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
    outline-offset: 1px;
  }

  .editor-screen-title {
    flex: 1 1 auto;
    min-width: 0;
    margin: 0;
    overflow: hidden;
    font-size: 0.9375rem;
    font-weight: 700;
    line-height: 1.2;
    color: hsl(0, 0%, 15%);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .editor-screen-body {
    flex: 1 1 auto;
    min-height: 0;
    min-width: 0;
    overflow-x: clip;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 0.625rem 0.625rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
    -webkit-overflow-scrolling: touch;
  }

  .editor-screen-body :global(.editor-shelf) {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }
</style>
