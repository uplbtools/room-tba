<script lang="ts">
  import { modalStore } from "@lib/store.svelte";
  import EditorShelf from "@ui/EditorShelf.svelte";
  import "../map-chrome/map-chrome.css";
</script>

<div class="editor-tools-modal">
  <h2 class="editor-tools-modal__title">Editor tools</h2>
  <div class="editor-tools-modal__scroll map-chrome-scroll">
    <EditorShelf onclose={modalStore.closeModal} />
  </div>
</div>

<style>
  .editor-tools-modal {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    padding: 0.5rem 0.5rem 0.25rem;
    flex: 1 1 auto;
    min-height: 0;
  }

  .editor-tools-modal__title {
    margin: 0;
    padding-right: 2.25rem;
    font-size: 1rem;
    font-weight: 700;
    color: hsl(0, 0%, 15%);
  }

  .editor-tools-modal__scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding-right: 0.375rem;
    padding-bottom: 0.25rem;
  }
</style>
