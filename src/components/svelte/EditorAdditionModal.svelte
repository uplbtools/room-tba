<script lang="ts">
  import { fade } from "svelte/transition";
  import MapPinPlus from "@lucide/svelte/icons/map-pin-plus";
  import X from "@lucide/svelte/icons/x";
  import { editorChromeStore } from "@lib/store.svelte";
  import SuggestAdditionPanel from "@ui/SuggestAdditionPanel.svelte";

  function close() {
    editorChromeStore.closeAdditionModal();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") close();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if editorChromeStore.additionModalOpen}
  <div class="editor-addition-overlay" transition:fade={{ duration: 140 }}>
    <div
      class="editor-addition-frame"
      role="dialog"
      aria-modal="true"
      aria-labelledby="editor-addition-title"
    >
      <header class="editor-addition-header">
        <div class="editor-addition-title" id="editor-addition-title">
          <MapPinPlus size={16} aria-hidden="true" />
          <span>Add to map</span>
        </div>
        <button
          type="button"
          class="editor-addition-close"
          onclick={close}
          aria-label="Close add to map"
        >
          <X size={18} />
        </button>
      </header>
      <div class="editor-addition-body">
        <SuggestAdditionPanel
          mode="publish"
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
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background-color: rgba(8, 12, 22, 0.55);
  }

  .editor-addition-frame {
    display: flex;
    width: min(28rem, 100%);
    max-height: min(85dvh, 40rem);
    flex-direction: column;
    overflow: hidden;
    border-radius: 0.75rem;
    background: white;
    box-shadow: 0 18px 38px rgba(0, 0, 0, 0.3);
  }

  .editor-addition-header {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.625rem 0.875rem;
    border-bottom: 1px solid hsl(0, 0%, 92%);
  }

  .editor-addition-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    color: hsl(0, 0%, 15%);
  }

  .editor-addition-close {
    display: flex;
    border: none;
    border-radius: 0.375rem;
    background: transparent;
    color: hsl(0, 0%, 30%);
    cursor: pointer;
    padding: 0.25rem;
  }

  .editor-addition-close:hover,
  .editor-addition-close:focus-visible {
    background-color: hsl(0, 0%, 95%);
    outline: 2px solid hsl(5, 53%, 32%);
    outline-offset: 1px;
  }

  .editor-addition-body {
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 1rem;
    -webkit-overflow-scrolling: touch;
  }
</style>
