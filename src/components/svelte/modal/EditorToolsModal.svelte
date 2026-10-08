<script lang="ts">
  import { modalStore } from "@lib/store.svelte";
  import EditorShelf from "@ui/EditorShelf.svelte";
  import ModalHeader from "./ModalHeader.svelte";
  import "../map-chrome/map-chrome.css";
</script>

<div class="editor-tools-modal">
  <ModalHeader title="Editor tools" />
  <div class="editor-tools-modal__scroll map-chrome-scroll">
    <EditorShelf onclose={modalStore.closeModal} />
  </div>
</div>

<style>
  .editor-tools-modal {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
  }

  .editor-tools-modal__scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding: 0 1rem 0.5rem;
  }
</style>
